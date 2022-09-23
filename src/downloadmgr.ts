import Curseforge, { Game, Mod, ModFile } from "node-curseforge"
import { Patches } from "./patches"
import { FileData, LFConfig, ObjectSet } from "./types"
import { lfPrefix, lfWarn } from "./global"
import { PathLike } from "fs"
import { SearchOptions } from "node-curseforge/dist/objects/types"

export { DownloadManager }



class DownloadManager {
    config: LFConfig
    modAPI: Curseforge
    gameAPI: Game
    modsByName: Map<string, Mod>
    modsByID: Map<number, Mod>
    modFiles: Array<ModFile>
    constructor(cfg: LFConfig, gameApi: Curseforge, game: Game) {
        this.config = cfg
        this.modAPI = gameApi
        this.gameAPI = game

        
        this.modFiles = new Array<ModFile>
    }

    private getMods(fileDatae: Iterable<FileData>, addFunc: Function) : Promise<Mod>[] {
        const promises = new Array<Promise<Mod>>
        for (const fd of fileDatae) {
            promises.push((async () => {
                const mod = this.modAPI.get_mod(fd.projectID)
                addFunc(mod)
                return mod 
            })())
        }

        return promises
    }

    private setMyMods() {
        this.modsByName = new Map<string, Mod>
        this.modsByID = new Map<number, Mod>
        const promises = this.getMods(this.config.files.values(), (mod: Mod) => {
            this.modsByID.set(mod.id, mod)
            this.modsByName.set(mod.name, mod)
            return mod
        })
        return promises
    }

    private getModsSimple(fileDatae: Iterable<FileData>) : Promise<Mod>[] {
        return this.getMods(fileDatae, (mod: Mod) => mod);
    }

    
    private processStaticPatches(addedFiles: ObjectSet<FileData>, removedFiles: ObjectSet<FileData>) {
        //process removals
        for (let [name, fileData] of this.config.files) {
            if(removedFiles.has(fileData)) {
                this.config.files.delete(name)
            }
        }

        //process additions
        for (const fileData of addedFiles) {
            this.config.files.set(fileData.projectID, fileData)
        }
    }

    private searchMod(search: SearchOptions) : Promise<Mod> {
        return this.gameAPI.search_mods({...search, index:0, pageSize: 10})[0]
    }

    private async searchMods(searches: SearchOptions[]) : Promise<ObjectSet<Mod>> {
        const mods = new ObjectSet<Mod>
        const promises = new Array<Promise<void>>
        for (const search of searches) {
            promises.push((async () => {
                mods.add(await this.searchMod(search))
            })())
        }

        await Promise.all(promises)

        return mods
    }

    async processPatches(patches: Patches) {
        if (patches == null) {
            return
        }

        this.processStaticPatches(patches.additions.fileData, patches.removals.fileData)

        let promises: Promise<Mod>[]
        if(this.modsByID == undefined || this.modsByName == undefined) {
            promises = this.setMyMods()
        }

        const [, mods2Add, mods2Rem] = await Promise.all([promises, 
            this.searchMods(patches.additions.searches),
            this.searchMods(patches.removals.searches),
        ])

        for(const mod of this.modsByID.values()) {
            if(mods2Rem.has(mod)) {
                this.modsByID.delete(mod.id)
                this.modsByName.delete(mod.name)
            }
        }

        for (const mod of mods2Add) {
            this.modsByID.set(mod.id, mod)
            this.modsByName.set(mod.name, mod)
        }
    }

    private async getFile(modFile: ModFile, dir: String) {
        if (modFile == null) {
            console.warn(lfWarn("file failed to download (ModFile was null)"))
            return false
        }
    
        if (modFile.downloadUrl == null) {
            console.warn(lfWarn("file failed to download (downloadUrl was null) "))
            return false
        }
    
        let path: PathLike = dir + "/" + modFile.fileName
        let good = await modFile.download(path, true)
        if (!good) {
            console.warn(lfWarn("file " + modFile.fileName + " failed its checksum. "))
            return false
        }
    
        const pad = (str: string) => {
            for (let i = 60; i > str.length;) {
                str += " "
            }
            return str
        }
    
        return true
    }


    async downloadMods(dlPath: string) {
        let promises = new Array<Promise<boolean>> 
        for (const modFile of this.modFiles) {
            promises.push(this.getFile(modFile, dlPath))
        }
        await Promise.all(promises)
    }
}