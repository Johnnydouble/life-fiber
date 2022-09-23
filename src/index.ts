import { Curseforge, ModFile } from "node-curseforge";

import fs, { PathLike } from "fs";
import { exit } from "process";

import { TKN_FILE , MFT_FILE, CFG_FILE, DL_DIR } from "./global"
import { lfPrefix, lfWarn} from "./global"
import { Patches, Diff } from "./patches"
import { FileData, LFConfig } from "./types";
import { DownloadManager } from "./downloadmgr";

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
    if (fs.existsSync(CFG_FILE)) {
        patches = Patches.fromJSONStringCommented(fs.readFileSync(CFG_FILE).toString())
    }

    const dlmgr = new DownloadManager(config, cf, await mc)
    dlmgr.processPatches(patches)

    if (!fs.existsSync(DL_DIR)) {
        fs.mkdirSync(DL_DIR);
    }

    const dlPathFull = DL_DIR + "/" + config.packName

    if (!fs.existsSync(dlPathFull)) {
        fs.mkdirSync(dlPathFull);
    }

    await dlmgr.downloadMods(dlPathFull)
}

main()
