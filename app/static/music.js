let dataList = []
let websocket
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
            renderMusicSheet(dataList);
        })
       .catch(error => console.error('Error fetching data:', error));
});

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
;
    console.log(dataList);
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




function sendDataToBackend(audioData) {
    // Play the audio data locally
  // const audioUrl = URL.createObjectURL(audioData);
  // const audioElement = document.createElement('audio');
  // audioElement.src = audioUrl;
  // // //
  // // // Save the audio data to the local machine
  // const a = document.createElement('a');
  // a.href = audioUrl;
  // a.download = 'recorded_audio.wav';
  // a.click();
     const params = {
          msg: '语音文件',
          username: '用户',
          recordData: audioData.data, // 录音文件
          duration: String(self.recorderTime)
        };

  websocket.send(audioData);
}


function startPractice() {

        websocket = new WebSocket("ws://127.0.0.1:8081/ws");
        // Send a message to the backend to start the practice session

        const connectBtn = document.getElementById('connect-btn');

        // Handle messages from the backend
        websocket.onmessage = function (event) {
             connectBtn.classList.remove('btn-success');
             connectBtn.classList.add('btn-danger');
             connectBtn.textContent = 'Stop';
            console.log('Received message from backend:', event.data);
            const note = event.data;
            renderNote(note); // 调用渲染函数
            console.log(note); // 打印接收到的音符
        };

                // Handle errors
        websocket.onerror = function (event) {
             connectBtn.classList.remove('btn-danger');
             connectBtn.classList.add('btn-success');
             connectBtn.textContent = 'Start';
        };

        // Handle the connection closing
        websocket.onclose = function (event) {
            console.log('Connection closed:', event);
        };

        let index = 0; // 用于跟踪当前的音符组
        let note_index = 0; // 用于跟踪当前音符组内的音符
        let matchedNotes = 0; // 匹配成功的音符数量

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


    function matchNoteWithScore(index, note, noteIndex) {

        if (index >= dataList.length || noteIndex >= dataList[index].length) return false;
        let currentNote = dataList[index][noteIndex];
        console.log("matchNoteWithScore", note, currentNote.pitch.includes(note))
        // 实现匹配逻辑
        return currentNote.pitch.includes(note); // 确保完全匹配
    }

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

    function highlightMatchedNotes(backEndNoteName) {
        // 使用映射表将特定音符名称转换为标准音符名称
        const standardNoteName = noteMapping[backEndNoteName] || backEndNoteName;
        console.log(standardNoteName)
        // 只获取音符名称的字母部分，例如从"D/5"中提取"D"
        const noteLetter = standardNoteName.split('/')[0];

        let {index, noteIndex, accumulatedDuration} = state;

        if (dataList[index] && dataList[index][noteIndex]) {
            const currentNote = dataList[index][noteIndex];

            // 提取当前音符的字母部分
            const currentNoteLetter = currentNote.pitch.split('/')[0];
            const isRestNote = currentNote.duration.includes('r');
            console.log(currentNote.type)
            console.log(isRestNote)
            const durationValues = {
                'w': 4,
                'h': 2,
                'q': 1,
                'qr': 2,
                '8': 0.5,
                '16': 0.25,
                '8r': 1
            };


            // 使用转换后的音符字母进行匹配
            if (isRestNote || currentNoteLetter === noteLetter && !currentNote.highlight) {
                currentNote.highlight = true;
                console.log(`Highlighting note: ${currentNote.pitch} at group ${index}, position ${noteIndex}`);

                // 根据音符的持续时间更新累计时长
                const durationValue = durationValues[currentNote.duration];
                accumulatedDuration += durationValue;

                // 判断是否需要移动到下一组音符
                if (accumulatedDuration >= 4) {
                    index++;
                    noteIndex = 0;
                    accumulatedDuration = 0;
                    console.log(`Moving to next group ${index}`);
                } else {
                    noteIndex += 1;
                }

                // 更新状态
                state.index = index;
                state.noteIndex = noteIndex;
                state.accumulatedDuration = accumulatedDuration;
            } else {
                console.log(`Note does not match or already highlighted: ${currentNote.pitch}`);
            }
        } else {
            console.log(`No note found at index ${index}, noteIndex ${noteIndex}`);
        }



       renderMusicSheet(dataList)
    }

    navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 48000 } })
      .then(function(stream) {
        // 创建 MediaRecorder 对象进行录制
        var mediaRecorder = new MediaRecorder(stream);
        var chunks = [];

        // 获取音频轨道
        var audioTrack = stream.getAudioTracks()[0];

        // 输出采样率
        console.log('初始采样率为: ' + audioTrack.getSettings().sampleRate + 'Hz');

        // 设置 ondataavailable 事件处理函数
        mediaRecorder.ondataavailable = function(e) {
          if (e.data.size > 0) {
                 // 将音频片段添加到audioChunks数组中
                chunks.push(e.data);
              }
        };

        // 设置 onstop 事件处理函数
        mediaRecorder.onstop = function(e) {
          // 将录制的音频数据转换为 Blob 对象
          var blob = new Blob(chunks, { type: 'audio/wav' });
          // 输出采样率
          console.log('录制的音频采样率为: ' + audioTrack.getSettings().sampleRate + 'Hz');
          var sampleRate = audioTrack.getSettings().sampleRate; // 采样率
        var bytesPerSample = 2; // 每个样本的字节大小（16位音频）
        var desiredSize = sampleRate * 1 * bytesPerSample; // 期望的音频数据大小

        var blobSize = blob.size; // Blob 中音频数据的大小
        console.log(blob)
        console.log(blobSize)
        console.log(sampleRate)
        console.log(bytesPerSample)
        console.log(desiredSize)
        if (blobSize % bytesPerSample === 0 && blobSize === desiredSize) {
        // 发送 Blob
        sendDataToBackend(blob);
        chunks = [];
        console.log('录制的音频数据大小符合要求，已发送到后端。');
    } else {
              chunks = [];
        console.log('录制的音频数据大小不符合要求，未发送到后端。');
    }

          // 清空 chunks 数组以便下次录制

        };

        // 开始录制
        mediaRecorder.start();

        // 每隔一秒录制一次
        setInterval(function() {
          mediaRecorder.stop();
          mediaRecorder.start();
        }, 1300);
      })
      .catch(function(err) {
        console.log('获取用户音频流失败：', err);
      });

}




