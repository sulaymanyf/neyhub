import json
import os

import xmltodict
from fastapi import Depends
from sqlalchemy.orm import Session

from .files_service import read_file, update_file
from ..utils.database import get_db
from ..utils.parse_tool import run_audiver, dict2json


async def parse_file_to_json(file_id: int, db: Session = Depends(get_db)):
    file_db = await read_file(file_id,db)
    file_name = os.path.splitext(os.path.basename(file_db.file_path))[0]
    # Extract the last directory
    dir_path = os.path.dirname(file_db.file_path)
    xml = run_audiver(file_name,file_db.file_path,dir_path)

    xml_path = os.path.join(dir_path, f"xml\\{file_name}.xml")
    print(xml_path)
    if xml:
        with open(xml_path, 'r') as f:
            xml_string = f.read()

        xml_dict = xmltodict.parse(xml_string)
        note_list = dict2json(xml_dict)
        print(note_list)
        file_db.parsed_data = note_list
        file_db.parsed = 1
        db_file = await update_file(file_db, db)
        if db_file.parsed_data == "":
            return False
        return True
    return False



