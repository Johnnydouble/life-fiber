export {TKN_FILE, MFT_FILE, CFG_FILE, DL_DIR, CONC_DL}
export {lfPrefix, lfWarn, lfFinfo}

const TKN_FILE = ".cf_token"
const MFT_FILE = "manifest.json"
const CFG_FILE = "config.json"
const DL_DIR = "./downloads"
const CONC_DL = 5

function lfPrefix(lfMsg: String) {
    return "[life-fiber]: " + lfMsg
}

function lfWarn(lfWarning: String) {
    return lfPrefix("[ /!\\ WARNING ]: " + lfWarning + " --------------------<")
}

function lfFinfo(cfFileData: any) {
    return "\"{projectID:\"" + cfFileData.projectID + ", \"fileID\":" + cfFileData.fileID + ", required:" + cfFileData.required + "}"
}
