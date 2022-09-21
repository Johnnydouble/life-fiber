import { Curseforge, ModFile } from "node-curseforge";

import fs, { PathLike } from "fs";
import { exit } from "process";
import * as readline from 'node:readline';
import process from 'node:process';

import { TKN_FILE , MFT_FILE, DL_DIR, CONC_DL } from "./global"
import { lfPrefix, lfWarn, lfFinfo } from "./global"
import { applyPatches } from "./patches"
import { FileData } from "./types";
import { json } from "stream/consumers";

async function getFile(cf: Curseforge, file: any, dir: String) {
    let modFile: ModFile
    try {
        modFile = await cf.get_file(file.projectID, file.fileID)
    } catch (error) {
        console.warn(lfWarn("file failed to download (resource not found) " + JSON.stringify(file)))
        return false
    }
    if (modFile == null) {
        console.warn(lfWarn("file failed to download" + JSON.stringify(file)))
        return false
    }

    if (modFile.downloadUrl == null) {
        console.warn(lfWarn("file failed to download (downloadUrl was null) " + JSON.stringify(file)))
        return false
    }

    let path: PathLike = dir + "/" + modFile.fileName
    let good = await modFile.download(path, true)
    if (!good) {
        console.warn(lfWarn("file " + modFile.fileName + " failed its checksum. " + JSON.stringify(file)))
        return false
    }

    const pad = (str: string) => {
        for (let i = 60; i > str.length;) {
            str += " "
        }
        return str
    }


    console.log(lfPrefix(pad(modFile.fileName + " downloaded!") + "\t" + JSON.stringify(file)))
    return true
}

async function main() {
    let cf_token = fs.readFileSync(TKN_FILE).toString()
    let cf: Curseforge = new Curseforge(cf_token);

    if (!fs.existsSync(MFT_FILE)) {
        console.log(MFT_FILE + " not found.")
        exit(1)
    }

    let {files} = JSON.parse(fs.readFileSync(MFT_FILE).toString())

    let patchedFiles: Map<string, FileData> = await applyPatches(files, cf)

    // const rl = readline.createInterface({ input:process.stdin, output:process.stdout });
    // const ask = (question: string) => new Promise(r => rl.question(question, r));
    // let answer = await ask('Continue? [okay:Enter] ');
    // if(answer !== "") {
    //     exit(0)
    // }
    console.log(lfPrefix("--------------------> [ Downloading Files ] <--------------------"))

    if (!fs.existsSync(DL_DIR)) {
        fs.mkdirSync(DL_DIR);
    }

    let promises = new Array<Promise<boolean>>()
    let running = 0
    for (const file of patchedFiles.values()) {
        promises.push(getFile(cf, file, DL_DIR))
        running++
        if (running >= CONC_DL) {
            await Promise.race(promises)
            running--
        }
    }

}

main()
