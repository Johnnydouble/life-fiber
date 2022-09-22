import Curseforge, { Game, Mod, ModFile } from "node-curseforge"
import { Patches } from "./patches"
import { FileData, LFConfig } from "./types"
import { lfWarn } from "./global"

export { DownloadManager }



class DownloadManager {
    config: LFConfig
    modAPI: Curseforge
    modsByName: Map<string, Mod>
    modsByID: Map<number, Mod>
    constructor(cfg: LFConfig, gameApi: Curseforge) {
        this.config = cfg
        this.modAPI = gameApi
    }

    private getMods(completionPromises: Promise<void>[]) {
        this.config.files.forEach((modFileData: FileData) => {
            completionPromises.push((async () => {
                const mod = await this.modAPI.get_mod(modFileData.projectID)
                this.modsByID.set(modFileData.projectID, mod)
                this.modsByName.set(mod.name, mod)
            })())
        })
    }

    processPatches(patches: Patches) {
        if (patches == null) {
            return
        }

        let promises = new Array<Promise<void>>
        if(this.modsByID == undefined || this.modsByName == undefined) {
            this.getMods(promises)
        }




        Promise.all(promises)

    }

    private async getFile(cf: Curseforge, file: any, dir: String) {
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

    downloadMods(dlPath: string) {
        let promises = new Array<Promise<boolean>>()
        for (const [name, mod] of this.modsByName) {
            promises.push(getFile(cf, file, DL_DIR))
            running++
            if (running >= CONC_DL) {
                await Promise.race(promises)
                running--
            }
        }
    }
}