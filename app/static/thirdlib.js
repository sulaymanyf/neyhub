/**
 * Copyright FunASR (https://github.com/alibaba-damo-academy/FunASR). All Rights
 * Reserved. MIT License  (https://opensource.org/licenses/MIT)
 */
/* 2022-2023 by zhaoming,mali aihealthx.com */
   const state = {
        index: 0,
        noteIndex: 0,
        accumulatedDuration: 0,
    };

    const noteMapping = {
        "re": "D",
        "do": "C",
        "fa": "F",
        "sol": "G",
        "mi": "E",
        "si": "B",
        "la": "A"
    };
let dataList = []
let collectedSampleCount = 0; // 已收集的样本数量
let startTime = new Date().getTime();
const div = document.getElementById("music-container");



$(document).ready(function() {
    var id = getUrlParameter("id");
    var file_name = getUrlParameter("file_name");
    console.log("ID:", id);
    console.log("File Name:", file_name);

    fetch('http://127.0.0.1:8081/files/' + id)
       .then(response => response.json())
       .then(data => {
            console.log('Received data from backend:', data);

            dataList =  JSON.parse(data.parsed_data);
            initMusicSheet(dataList);
        })
       .catch(error => console.error('Error fetching data:', error));
});

// 连接; 定义socket连接类对象与语音对象
var wsconnecter = new WebSocketConnectMethod({msgHandle:getJsonMessage,stateHandle:getConnState});
var audioBlob;

// 录音; 定义录音对象,wav格式
var rec = Recorder({
    type: 'wav',
	bitRate:16,
	sampleRate:16000,
	onProcess:recProcess
});




var sampleBuf=new Int16Array();
// 定义按钮响应事件
var ready = document.getElementById('connect-btn-ready');
var start = document.getElementById('connect-btn');
var stop = document.getElementById('connect-btn-stop');
ready.disabled = false;
start.disabled = true;
stop.hidden = true;
btnConnect= document.getElementById('btnConnect');



var rec_text="";  // for online rec asr result
var offline_text=""; // for offline rec asr result
var info_div = document.getElementById('info_div');

var upfile = document.getElementById('upfile');



var isfilemode=false;  // if it is in file mode
var file_ext="";
var file_sample_rate=16000; //for wav file sample rate
var file_data_array;  // array to save file data




function getUrlParameter(name) {
    var url = window.location.href;
    var param = url.split("?")[1];
    var params = param.split("&");
    for (var i = 0; i < params.length; i++) {
        var pair = params[i].split("=");
        if (pair[0] === name) {
            return pair[1];
        }
    }
    return null;
}

function renderMusicSheet(dataList) {
    const VF = Vex.Flow;
    const div = document.getElementById("music-container");
    // Initialize VexFlow
    const vf = new VF.Formatter();
    // Render the music sheet using VexFlow
    div.innerHTML = "";  // 清空之前的内容
    var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    // 设置渲染器大小，这里假设一行足够宽，可以显示多个小节
    const totalWidth = 1030; // 总宽度，可以根据实际情况调整
    renderer.resize(totalWidth, 250); // 高度根据需要调整
    var context = renderer.getContext();
    const staveWidth = 240; // 每个小节的宽度
    let staveStartX = 10; // Stave的起始X位置
    let staveStartY = 20; // Stave的起始Y位置
    let lineCount = 1; // 已渲染的行数

    // console.log(dataList);
    // Create VexFlow Renderer element with id #boo.
     function dotted(note) {
        VF.Dot.buildAndAttach([note], {all: true});
        return note;
    }
    const turkishNeyMapping = {
            'C': 'DO',
            'D': 'RE',
            'E': 'MI',
            'F': 'FA',
            'G': 'SOL',
            'A': 'LA',
            'B': 'SI'
            // 更多映射可以根据需要添加
    };

    dataList.forEach((measure, index) => {
        // 检查是否需要换行
        if (staveStartX + staveWidth > totalWidth) {
            staveStartX = 10; // 重置X位置到下一行的起始
            staveStartY += 100; // 增加Y位置以开始新的一行，120可以根据实际需要调整
            lineCount++; // 增加行数
        }
        // 为每个小节创建一个Stave，位置随着小节编号逐渐向右移动
        const stave = new VF.Stave(staveStartX, staveStartY, staveWidth);

        // 只在第一个小节添加谱号和拍号
        if (index === 0) {
            stave.addClef("treble").addTimeSignature("4/4");
        }

        stave.setContext(context).draw();
        const notes = [];

        let currentBeamNotes = [];
        // 将每个小节的音符转换为VexFlow的StaveNote对象
        measure.forEach((note, index) => {

            if (note.dot > 0) {
                notes.push(dotted(new VF.StaveNote({keys: [note.pitch], duration: note.duration})))
            }
            const staveNote = new VF.StaveNote({
                keys: [note.pitch],
                duration: note.duration,
                stem_direction: note.stemDirection === 1 ? VF.Stem.UP : VF.Stem.DOWN,
            });
            if (note.highlight){
                staveNote.setStyle({ fillStyle: "red", strokeStyle: "red" });
            }
            const noteLetter =note.pitch.split('/')[0];


                          // 使用映射关系查找土耳其ney音符
            let turkishNote = turkishNeyMapping[noteLetter];
            if (note.type == 'rest'){
                turkishNote = 'rest';
            }
            // 创建注释
            const annotation = new VF.Annotation(turkishNote);

            // 将注释添加到音符上
            staveNote.addModifier(annotation);

            notes.push(staveNote)


        })


        // 创建连线
        const beams = VF.Beam.generateBeams(notes, {
            beam_rests: false,
            beam_middle_only: true,
            show_stemlets: false,
        });
        // 格式化并绘制音符
        VF.Formatter.FormatAndDraw(context, stave, notes);
        beams.forEach((beam) => {
            beam.setContext(context).draw();
        });

        // 更新下一个Stave的起始X位置
        staveStartX += staveWidth + 10; // 增加一些间隔
        renderer.resize(totalWidth, staveStartY + 120);
    });



}


function initMusicSheet(dataList) {
    const VF = Vex.Flow;
    const div = document.getElementById("music-container");
    // Initialize VexFlow
    const vf = new VF.Formatter();
    // Render the music sheet using VexFlow
    div.innerHTML = "";  // 清空之前的内容
    var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    // 设置渲染器大小，这里假设一行足够宽，可以显示多个小节
    const totalWidth = 1030; // 总宽度，可以根据实际情况调整
    renderer.resize(totalWidth, 250); // 高度根据需要调整
    var context = renderer.getContext();
    const staveWidth = 240; // 每个小节的宽度
    let staveStartX = 10; // Stave的起始X位置
    let staveStartY = 20; // Stave的起始Y位置
    let lineCount = 1; // 已渲染的行数

    // console.log(dataList);
    // Create VexFlow Renderer element with id #boo.
     function dotted(note) {
        VF.Dot.buildAndAttach([note], {all: true});
        return note;
    }
    const turkishNeyMapping = {
            'C': 'DO',
            'D': 'RE',
            'E': 'MI',
            'F': 'FA',
            'G': 'SOL',
            'A': 'LA',
            'B': 'SI',
            'G#': '',
            'E#': ''
            // 更多映射可以根据需要添加
    };

    dataList.forEach((measure, index) => {
        // 检查是否需要换行
        if (staveStartX + staveWidth > totalWidth) {
            staveStartX = 10; // 重置X位置到下一行的起始
            staveStartY += 100; // 增加Y位置以开始新的一行，120可以根据实际需要调整
            lineCount++; // 增加行数
        }
        // 为每个小节创建一个Stave，位置随着小节编号逐渐向右移动
        const stave = new VF.Stave(staveStartX, staveStartY, staveWidth);

        // 只在第一个小节添加谱号和拍号
        if (index === 0) {
            stave.addClef("treble").addTimeSignature("4/4");
        }

        stave.setContext(context).draw();
        const notes = [];

        let currentBeamNotes = [];
        // 将每个小节的音符转换为VexFlow的StaveNote对象
        measure.forEach((note, index) => {

            if (note.dot > 0) {
                notes.push(dotted(new VF.StaveNote({keys: [note.pitch], duration: note.duration})))
            }
            const staveNote = new VF.StaveNote({
                keys: [note.pitch],
                duration: note.duration,
                stem_direction: note.stemDirection === 1 ? VF.Stem.UP : VF.Stem.DOWN,
            });
            if (note.highlight){
                staveNote.setStyle({ fillStyle: "red", strokeStyle: "red" });
            }
            const noteLetter =note.pitch.split('/')[0];

            console.log(noteLetter)
                          // 使用映射关系查找土耳其ney音符
            let turkishNote = turkishNeyMapping[noteLetter];
            console.log(turkishNote)
            if (note.type == 'rest'){
                turkishNote = 'rest';
            }
            // 创建注释
            const annotation = new VF.Annotation(turkishNote);

            // 将注释添加到音符上
            staveNote.addModifier(annotation);

            notes.push(staveNote)


        })


        // 创建连线
        const beams = VF.Beam.generateBeams(notes, {
            beam_rests: false,
            beam_middle_only: true,
            show_stemlets: false,
        });
        // 格式化并绘制音符
        VF.Formatter.FormatAndDraw(context, stave, notes);
        beams.forEach((beam) => {
            beam.setContext(context).draw();
        });

        // 更新下一个Stave的起始X位置
        staveStartX += staveWidth + 10; // 增加一些间隔
        renderer.resize(totalWidth, staveStartY + 120);
    });


}




// 语音识别结果; 对jsonMsg数据解析,将识别结果附加到编辑框中
function getJsonMessage( jsonMsg ) {
	 // const connectBtn = document.getElementById('connect-btn');
     // connectBtn.classList.remove('btn-success');
     // connectBtn.classList.add('btn-danger');
     // connectBtn.textContent = 'Stop';
     // console.log('Received message from backend:', event.data);
     const note = event.data;
     renderNote(note); // 调用渲染函数
     // console.log(note); // 打印接收到的音符
}

 function renderNote(note) {
            highlightMatchedNotes(note);
            // if (index >= notesList.length) return; // 如果已处理完所有音符组，则退出
            // // const isMatch = matchNoteWithScore(index, note, note_index); // 匹配乐谱中的音符
            // if (isMatch) {
            //     matchedNotes += 1;
            //     highlightMatchedNote s(index,note_index); // 高亮显示这些音符
            //     note_index += 1;
            //    if (matchedNotes >= notesList[index].length) { // 如果连续匹配了4个音符
            //         index += 1;
            //         matchedNotes = 0; // 重置计数器，准备下一组匹配
            //     }
            // } else {
            //     note_index = Math.max(0, note_index - 1); // 如果匹配失败，回退note_index
            //     matchedNotes = 0; // 重置计数器
            // }
        }


function celebart(gid) {
    const gElement = document.getElementById(gid); // Replace with the actual ID
    const bbox = gElement.getBoundingClientRect();
    const x = bbox.x;
    const y = bbox.y;
    const canvasContainer = document.getElementById('music-container');

    var myCanvas = document.createElement('canvas');
    canvasContainer.appendChild(myCanvas);

      // Position the canvas container on top of the <g> element
        myCanvas.style.position = 'absolute';
        console.log(myCanvas)
        var myConfetti = confetti.create(myCanvas, {
          resize: true,
          useWorker: true
        });
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const xNormalized = x / screenWidth;
        const yNormalized = y / screenHeight;
         confetti({
          particleCount: 50,
          startVelocity: 30,
          spread: 10,
          origin: {
            x:  xNormalized,
            // since they fall down, start a bit higher than random
            y: yNormalized
          }
        });
        canvasContainer.removeChild(myCanvas)
}

function highlightMatchedNotes(backEndNoteName) {


    const standardNoteName = noteMapping[backEndNoteName] || backEndNoteName;

    // 使用映射表将特定音符名称转换为标准音符名称
    // console.log("standardNoteName", standardNoteName)
    // 只获取音符名称的字母部分，例如从"D/5"中提取"D"
    const noteLetter = standardNoteName.split('/')[0];

    let {index, noteIndex, accumulatedDuration} = state;

    if (dataList[index] && dataList[index][noteIndex]) {
        const currentNote = dataList[index][noteIndex];

        // 提取当前音符的字母部分
        const currentNoteLetter = currentNote.pitch.split('/')[0];
        // console.log(`currentNoteLetter${currentNoteLetter}`)

        // console.log(currentNote.type)
        // console.log(isRestNote)
        const durationValues = {
            'w': 4,
            'h': 2,
            'q': 1,
            'qr': 2,
            '8': 0.5,
            '16': 0.25,
            '8r': 1
        };
        let isRestNote

        // console.log(`No note found at index ${index}, noteIndex ${noteIndex}`);
        // console.log(`currentNoteLetter ${currentNoteLetter}, noteLetter ${noteLetter}`);
        // console.log(`isRestNote ${isRestNote}, currentNote.highlight ${currentNote.highlight}`);
        const nextNote = dataList[index][noteIndex + 1]
        console.log(`nextNote ${nextNote}`)
        console.log(`index  ${index} notinde ${noteIndex}`)
        if (nextNote !== undefined && nextNote !== null) {
            // 处理非空情况
            // 在这里编写你的代码来处理非空的情况
            isRestNote = !!nextNote.duration.includes('r');

        }

        // 使用转换后的音符字母进行匹配
        if (!currentNote.highlight  && currentNoteLetter === noteLetter  ) {
             let durationValue = durationValues[currentNote.duration];
             let nextdurationValue = 0
             if (isRestNote){
                 nextdurationValue = durationValues[nextNote.duration];
             }
            // console.log(`Highlighting note: ${currentNote.pitch} at group ${index}, position ${noteIndex}`);
            currentNote.highlight = true;
            // 根据音符的持续时间更新累计时长
             accumulatedDuration += durationValue;
            // 判断是否需要移动到下一组音符
            console.log(`accumulatedDuration ${accumulatedDuration}`)
            if (accumulatedDuration >= 4) {
                const gList = [];
                const staveBarlineElements = div.querySelectorAll('.vf-stavebarline');
                for (let i = 1; i < staveBarlineElements.length; i += 2) {
                    const thirdElement = staveBarlineElements[i];
                    gList.push(thirdElement.id);
                }
                console.log(gList);
                console.log(`Moving to next group ${index}`);
                console.log(`Moving to next group ${gList[index]}`);
                celebart(gList[index]);
                index++;
                noteIndex = 0;
                accumulatedDuration = 0;
                // console.log(`Moving to next group ${index}`);
            }else if (!isRestNote) {
                console.log(" else if ",noteIndex)
                noteIndex += 1;
            }
            console.log("isRestNote && accumulatedDuration ", isRestNote && accumulatedDuration)
            console.log("isRestNote  ", isRestNote  )
            console.log("accumulatedDuration  ", accumulatedDuration  )
            console.log("accumulatedDuration  ", nextdurationValue  )
            if (isRestNote ){
                nextNote.highlight = true;
                setTimeout(function() {
                    console.log("1 秒已过。");
                }, 1200);
                 accumulatedDuration += nextdurationValue + durationValue;
                if(accumulatedDuration >= 4){
                     console.log(`isRestNote  else if  ${index}`);
                    const gList = [];
                    const staveBarlineElements = div.querySelectorAll('.vf-stavebarline');
                    for (let i = 1; i < staveBarlineElements.length; i += 2) {
                        const thirdElement = staveBarlineElements[i];
                        gList.push(thirdElement.id);
                    }
                    celebart(gList[index]);
                    // 更新状态
                    index++;
                    noteIndex = 0;
                    accumulatedDuration = 0;
            }
                }



            // 更新状态
            state.index = index;
            state.noteIndex = noteIndex;
            state.accumulatedDuration = accumulatedDuration;
        }

        else {
            console.log(`Note does not match or already highlighted: ${currentNote.pitch}`);
        }
         // 处理是否为休止符的情况

        //     // 使用转换后的音符字母进行匹配
        //     if ( isRestNote) {
        //         currentNote.highlight = true;
        //         // console.log(`Highlighting note: ${currentNote.pitch} at group ${index}, position ${noteIndex}`);
        //
        //         // 根据音符的持续时间更新累计时长
        //         const durationValue = durationValues[currentNote.duration];
        //         accumulatedDuration += durationValue;
        //
        //         // 判断是否需要移动到下一组音符
        //         if (accumulatedDuration >= 4) {
        //             const gList = [];
        //                 const staveBarlineElements = div.querySelectorAll('.vf-stavebarline');
        //                 for (let i = 1; i < staveBarlineElements.length; i += 2) {
        //                       const thirdElement = staveBarlineElements[i]
        //                      gList.push(thirdElement.id)
        //                 }
        //                 console.log(gList)
        //                 console.log(`Moving to next group ${index}`);
        //                 console.log(`Moving to next group ${gList[index]}`);
        //                 celebart(gList[index])
        //
        //             index++;
        //             noteIndex = 0;
        //             accumulatedDuration = 0;
        //
        //             // console.log(`Moving to next group ${index}`);
        //         } else {
        //             noteIndex += 1;
        //         }
        //
        //          if ( currentNoteLetter === noteLetter && !currentNote.highlight) {
        //                 currentNote.highlight = true;
        //                 // console.log(`Highlighting note: ${currentNote.pitch} at group ${index}, position ${noteIndex}`);
        //
        //                 // 根据音符的持续时间更新累计时长
        //                 const durationValue = durationValues[currentNote.duration];
        //                 accumulatedDuration += durationValue;
        //
        //                 // 判断是否需要移动到下一组音符
        //                 if (accumulatedDuration >= 4) {
        //                       const gList = [];
        //                         const staveBarlineElements = div.querySelectorAll('.vf-stavebarline');
        //                         for (let i = 1; i < staveBarlineElements.length; i += 2) {
        //                               const thirdElement = staveBarlineElements[i]
        //                              gList.push(thirdElement.id)
        //                         }
        //                         console.log(gList)
        //                         console.log(`Moving to next group ${index}`);
        //                         console.log(`Moving to next group ${gList[index]}`);
        //                         celebart(gList[index])
        //                     index++;
        //                     noteIndex = 0;
        //                     accumulatedDuration = 0;
        //
        //                     // console.log(`Moving to next group ${index}`);
        //                 } else {
        //                     noteIndex += 1;
        //                 }
        //                 // 更新状态
        //                 state.index = index;
        //                 state.noteIndex = noteIndex;
        //                 state.accumulatedDuration = accumulatedDuration;
        //
        //
        //     } else {
        //         console.log(`Note does not match or already highlighted: ${currentNote.pitch}`);
        //     }
        // } else {
        //     console.log(`No note found at index ${index}, noteIndex ${noteIndex}`);
        // }

        renderMusicSheet(dataList)
    }

}
// 连接状态响应
function getConnState( connState ) {
    console.log( 'connState: ' + connState );
	if ( connState === 0 ) { //on open


		// info_div.innerHTML='连接成功!请点击开始';

        ready.disabled = true;
        start.disabled = false;


	} else if ( connState === 1 ) {
		//stop();
	} else if ( connState === 2 ) {
		stop();
		console.log( 'connecttion error' );



		info_div.innerHTML='请点击连接';
	}
}
var recordDuration = 1000; // 1秒钟




function startPractice() {
	 rec.open( function(){
	 rec.start();
	 console.log("开始");
     start.disabled = true;
     stop.hidden = false;
	 });
	  // 在一秒钟后停止录音

}



// 识别启动、停止、清空操作
function connect_server() {

	// 清除显示
	//控件状态更新
 	console.log("isfilemode"+isfilemode);
	//启动连接
	var ret=wsconnecter.wsStart();
	// 1 is ok, 0 is error
	if(ret==1){
		console.log("正在连接asr服务器，请等待...")
		isRec = true;

        return 1;
	}
	else
	{
		console.log("请点击开始")
        ready.disabled = true;
        start.disabled = false;

		return 0;
	}
}


function stop_practice() {

		rec.stop(function(blob,duration){
            ready.disabled = true;
            start.disabled = false;
            stop.hidden = true;
            console.log(blob,duration)
            // rec.stop()
            //  ready.disabled = false;
		},function(errMsg){
			// console.log("errMsg: " + errMsg);
		});
   }



function recProcess( buffer, powerLevel, bufferDuration, bufferSampleRate,newBufferIdx,asyncEnd ) {
    if ( isRec === true ) {
              var data_48k = buffer[buffer.length-1];
              var  array_48k = new Array(data_48k);
              var data_16k=Recorder.SampleData(array_48k,bufferSampleRate,22050).data;
                // wsconnecter.wsSend(data_16k);
              sampleBuf = Int16Array.from([...sampleBuf, ...data_16k]);
            if (powerLevel > 0.1) { // adjust this threshold value based on your requirements
                  var chunk_size = 16800; // send chunks of 32,000 bytes
                  while (sampleBuf.length >= chunk_size) {
                        sendBuf = sampleBuf.slice(0, chunk_size);
                        sampleBuf = [];
                        // sampleBuf = sampleBuf.slice(chunk_size, sampleBuf.length);
                        wsconnecter.wsSend(sendBuf);
                        var endTime = new Date().getTime(); // 记录发送 chunk 后的时间
                        var interval = (endTime - startTime) / 1000; // 计算发送 chunk 的时间间隔（以秒为单位）
                        console.log("发送一个 chunk 的时间间隔（秒）：" + interval);
                    }
                } else {
                sampleBuf = [];

            }


	}

}
	// if ( isRec === true ) {
	// 	var data_48k = buffer[buffer.length-1];
    //
	// 	var  array_48k = new Array(data_48k);
	// 	var data_16k=Recorder.SampleData(array_48k,bufferSampleRate,16000).data;
    //
	// 	sampleBuf = Int16Array.from([...sampleBuf, ...data_16k]);
	// 	var chunk_size=960; // for asr chunk_size [5, 10, 5]
	// 	while(sampleBuf.length>=chunk_size){
	// 	    sendBuf=sampleBuf.slice(0,chunk_size);
	// 		sampleBuf=sampleBuf.slice(chunk_size,sampleBuf.length);
	// 		wsconnecter.wsSend(sendBuf);
	// 	}
	// }
