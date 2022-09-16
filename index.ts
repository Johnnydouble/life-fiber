import { Curseforge } from "node-curseforge";

import fs, { PathLike } from "fs";
import { exit } from "process";


const TKN_FILE = ".cf_token"
const CFG_FILE = "manifest.json"
const DL_DIR = "./downloads"
const CONC_DL = 5


function lfPrefix(lfMsg: String) {
    return "[life-fiber]: " + lfMsg
}

function lfWarn(lfWarning: String) {
    return lfPrefix("[/!\\WARNING]: " + lfWarning + " ----------------------------------------<")
}

function lfFinfo(cfFileData: any) {
    return "{pID:" + cfFileData.projectID + ", fID:" + cfFileData.fileID + ", req:" + cfFileData.required + "}"
}

async function getFile(cf: Curseforge, file: any, dir: String) {
    let modFile = await cf.get_file(file.projectID, file.fileID)
    if (modFile == null) {
        console.warn(lfWarn("file failed to download" + lfFinfo(file)))
        return false
    }

    if (modFile.downloadUrl == null) {
        console.warn(lfWarn("file failed to download (downloadUrl was null) " + lfFinfo(file)))
        return false
    }

    let path: PathLike = dir + "/" + modFile.fileName
    let good = await modFile.download(path, true)
    if (!good) {
        console.warn(lfWarn("file " + modFile.fileName + " failed its che6cksum. " + lfFinfo(file)))
        return false
    }
    console.log(lfPrefix(modFile.fileName + " downloaded!"))
    return true
}

async function main() {
    let cf_token = fs.readFileSync(TKN_FILE).toString()
    let cf: Curseforge = new Curseforge(cf_token)

    if (!fs.existsSync(CFG_FILE)) {
        console.log(CFG_FILE + " not found.")
        exit(1)
    }

    let cfg = JSON.parse(fs.readFileSync(CFG_FILE).toString())
    let files = cfg.files

    if (!fs.existsSync(DL_DIR)) {
        fs.mkdirSync(DL_DIR);
    }

    let downloads = async () => {
        let promises = new Array<Promise<boolean>>()
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            promises.push(getFile(cf, file, DL_DIR))
            if (promises.length >= CONC_DL) {
                await Promise.all(promises)
            }
        }
    }

    await downloads()
}

main()
