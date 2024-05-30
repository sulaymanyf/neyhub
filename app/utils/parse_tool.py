import json
import os
import subprocess

import zipfile


def extract_and_read_mxl(mxl_file_path, file_name):

    # 临时解压目录
    temp_directory = "xml"
    temp_dir_path = os.path.join(os.path.dirname(mxl_file_path), temp_directory)
    pdf_path = os.path.dirname(mxl_file_path)
    mxl_path = os.path.join(pdf_path, f"{file_name}.mxl")
    # 确保临时目录存在
    print("mxl_path", mxl_path)
    if not os.path.exists(temp_dir_path):
        os.makedirs(temp_dir_path)

    # 解压 MXL 文件
    try:
        with zipfile.ZipFile(mxl_path) as zip_ref:
            zip_ref.extractall(temp_dir_path)
            print(f"Extracted {mxl_path} to {temp_dir_path}")
        return True
    except Exception as e:
        print(f"Error extracting MXL file: {e}")
        return False


def run_audiver(file_name,pdf_path, output_dir):

    # 定义命令和参数
    command = [
        "D:\\Program Files\\Audiveris\\bin\\Audiveris.bat",
        "-batch",
        pdf_path,  # 直接放置文件名
        "-output", output_dir,  # 输出目录
        "-export" # 导出为MusicXML
    ]

    # 运行命令
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    # 输出结果
    if result.returncode == 0:
        print("命令执行成功，输出如下:")
        if extract_and_read_mxl(pdf_path, file_name):
            return True
        else:
            return False
    else:
        print("命令执行失败，错误如下:")
        return False


def xml_to_dict(element):
    dict_element = {}
    if element.text:
        dict_element[element.tag] = element.text.strip()
    else:
        dict_element[element.tag] = {}
        for child in element:
            if child.tag not in dict_element[element.tag]:
                dict_element[element.tag][child.tag] = xml_to_dict(child)
            else:
                if not isinstance(dict_element[element.tag][child.tag], list):
                    dict_element[element.tag][child.tag] = [dict_element[element.tag][child.tag]]
                dict_element[element.tag][child.tag].append(xml_to_dict(child))
    return dict_element


def dict2json(data):
    notes_list = []  # 确保每次调用这个函数时都重新开始收集音符
    duration_mapping = {
        'whole': 'w',
        'half': 'h',
        'quarter': 'q',
        'eighth': '8',
        'sixteenth': '16',
        '32nd': '32',
        '16th': '8',
        '64th': '64'

    }

    measure_data = data['score-partwise']['part']['measure']
    for measure in measure_data:
        current_group = []  # 在每个小节的开始重新初始化 current_group
        if 'note' in measure:
            notes = measure['note']
            if isinstance(notes, list):  # 处理多个note的情况
                for element in notes:

                    note_data = {"dot": element.get('dot', 0)}
                    if element.get('rest', False):
                        print('element',element)
                        # 如果这是一个休止符，尝试获取 display-step 和 display-octave
                        display_step = element['rest']['display-step']
                        display_octave = element['rest']['display-octave']
                        pitch = f"{display_step}/{display_octave}"
                        duration = duration_mapping.get(element.get('type', 'quarter'), '4')  # 默认值为四分音符
                        duration = duration + 'r'
                        note_data.update({
                            "pitch": pitch,
                            "type": "rest",
                            "duration": duration,
                            "stemDirection": 0  # 休止符没有茎方向
                        })
                    else:
                        accidental = '#' if 'accidental' in element and element['accidental'] == 'sharp' else ''
                        pitch = f"{element['pitch']['step']}{accidental}/{element['pitch']['octave']}"
                        duration = duration_mapping.get(element.get('type', 'quarter'), '4')  # 默认值为四分音符
                        stem_direction = 1 if element.get('stemDirection', 'up') == "up" else -1
                        note_data.update({
                            "pitch": pitch,
                            "duration": duration,
                            "stemDirection": stem_direction,
                            "type": "note"
                        })

                    current_group.append(note_data)  # 将音符或休止符添加到当前小节组
            else:  # 处理单个note的情况
                element = notes
                note_data = {"dot": element.get('dot', 0)}

                if element.get('rest', False):
                    # 如果这是一个休止符，尝试获取 display-step 和 display-octave
                    display_step = element['rest']['display-step']
                    display_octave = element['rest']['display-octave']
                    pitch = f"{display_step}/{display_octave}"
                    duration = duration_mapping.get(element.get('type', 'quarter'), '4')  # 默认值为四分音符
                    duration = duration + 'r'
                    note_data.update({
                        "pitch": pitch,
                        "type": "rest",
                        "duration": duration,
                        "stemDirection": 0  # 休止符没有茎方向
                    })
                else:
                    accidental = '#' if 'accidental' in element and element['accidental'] == 'sharp' else ''
                    pitch = f"{element['pitch']['step']}{accidental}/{element['pitch']['octave']}"
                    duration = duration_mapping.get(element.get('type', 'quarter'), '4')  # 默认值为四分音符
                    stem_direction = 1 if element.get('stemDirection', 'up') == "up" else -1
                    note_data.update({
                        "pitch": pitch,
                        "duration": duration,
                        "stemDirection": stem_direction,
                        "type": "note"
                    })

                current_group.append(note_data)  # 将音符或休止符添加到当前小节组

        notes_list.append(current_group)  # 将当前小节组添加到总列表

    # 将整个列表转换为 JSON
    notes_json = json.dumps(notes_list)
    print(notes_json)
    return notes_json

