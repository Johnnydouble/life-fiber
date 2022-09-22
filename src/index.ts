import { Curseforge, ModFile } from "node-curseforge";

import fs, { PathLike } from "fs";
import { exit } from "process";

import { TKN_FILE , MFT_FILE, CFG_FILE, DL_DIR } from "./global"
import { lfPrefix, lfWarn} from "./global"
import { Patches, Diff } from "./patches"
import { FileData, LFConfig } from "./types";
import { DownloadManager } from "./downloadmgr";

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
    let mc = cf.get_game('minecraft')

    if (!fs.existsSync(MFT_FILE)) {
        console.log(MFT_FILE + " not found.")
        exit(1)
    }

    const config = LFConfig.fromJSONString(fs.readFileSync(MFT_FILE).toString())

    let patches: Patches = null;
    if (!fs.existsSync(CFG_FILE)) {
        patches = Patches.fromJSONStringCommented(fs.readFileSync(CFG_FILE).toString())
    }

    const dlmgr = new DownloadManager(config, cf)
    dlmgr.processPatches(patches)

    if (!fs.existsSync(DL_DIR)) {
        fs.mkdirSync(DL_DIR);
    }

    const dlPathFull = DL_DIR + "/" + config.packName

    if (!fs.existsSync(dlPathFull)) {
        fs.mkdirSync(dlPathFull);
    }

    dlmgr.downloadMods(dlPathFull)
}

main()
