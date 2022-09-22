import { FileData } from "./types";
import { Curseforge, Game, Mod } from "node-curseforge"
import {  CFG_FILE, lfFinfo, lfPrefix, lfWarn } from "./global"
import fs from "fs";
import { PagingOptions, SearchOptions } from "node-curseforge/dist/objects/types";
import { json } from "stream/consumers";
import { ModsSearchSortField } from "node-curseforge/dist/objects/enums";


type ModData = Mod & FileData & SearchOptions
type ModDiff = Set<ModData>


function toFileMap(files: any) : Map<string, FileData> { 
    return new Map(files.map((file: any) => [file.projectID.toString(), {fileID: file.fileID, projectID: file.projectID, required: file.required} as FileData]));
}

async function findMod(game: Game, searchOptions: any) {
    const options = {
        ...searchOptions,
        index: 0,
        pageSize: 15,
        sortField: 1  //ModsSearchSortField 
    } as SearchOptions & PagingOptions
    options.classId = 6
    options.sortOrder = "desc"

    const mods = await game.search_mods(options)
    let mod: Mod
    if (searchOptions.exactMatch) {
        mod = mods.find(mod => mod.name == options.searchFilter)
    } else {
        mod = mods[0]
    }

    return {...mod, ...searchOptions} as ModData
}

async function getModFile(file: FileData, cf: Curseforge) {
    return cf.get_file(file.projectID, file.fileID)
}


async function getDiff(mc: Game, values: any) {
    const mods: ModDiff = Array(values.length) // a performance hack
    for (const i in values) {
        const value = values[i]
        if (value.mod != null) {
            const mod = await findMod(mc, value.mod)
            if(value.gameVersion != null) {
                mods[i] = {mod, ver: value.gameVersion}
            } else {
                mods[i] = mod
            }
        }
        if(value.file != null) {
            mods[i] = value.file as FileData
        }
    }
    return mods;
}

async function applyPatches(files: any, cf:Curseforge) {
    if(!fs.existsSync(CFG_FILE)) {
        return
    }

    let req = cf.get_game("minecraft")
    let jsonStr = fs.readFileSync(CFG_FILE).toString();
    jsonStr = jsonStr.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    let cfg = JSON.parse(jsonStr)
    let filesToDOW = toFileMap(files)
    let mc = await req

    const [modsToAdd, modsToRem] = await Promise.all([
        getDiff(mc, cfg.additions),
        getDiff(mc, cfg.removals),
    ]);

    console.log(lfPrefix("--------------------> Processing Removals... <--------------------"))

    modsToRem.forEach((mod) => {
        if(mod.fileID == undefined) {
            //handle as mod
            console.log(lfPrefix("\\ Found Removal Candidate Mod: \"" + mod.name + "\" (" + mod.slug + ")"))
            let modID = mod.id.toString()
            if(filesToDOW.has(modID)) {
                if(filesToDOW.delete(modID)) {
                    console.log(lfPrefix(" \\> Removed Mod File: \"" + lfFinfo(filesToDOW.get(modID)) + "\""))
                } else {
                    console.warn(lfPrefix(" \\> Mod File Not Present in Manifest:  \"" + lfFinfo(filesToDOW.get(modID)) + "\""))
                }
            } else {
                console.warn(lfPrefix(" \\> No file found"))
            }
        } else {
            //handle as file
            if(filesToDOW.delete(mod.projectID.toString())) {
                console.log(lfPrefix("  > Removed Mod File: \"" + lfFinfo(mod) + "\""))
            } else {
                console.warn(lfPrefix("  > Failed to Remove Mod File: \"" + lfFinfo(mod) + "\""))
            }
        }
        
    })

    console.log(lfPrefix("--------------------> Processing Additions... <--------------------"))

    let promises = new Array<Promise<void>>()
    for (const mod of modsToAdd) {
        promises.push(
            (async () => {
                if(mod.fileID || mod.id) {
                    let m = mod
                    if(mod.id) {  
                        
                        let modFiles = await m.get_files({gameVersion: m.gameVersion})
                        let f = modFiles.sort((a, b) => {
                            return (a.fileDate > b.fileDate) ? 1: -1
                        })[0]
                        
                        console.log(lfPrefix("\\ Found Addition Candidate Mod: \"" + m.name + "\" (" + m.slug + ")"))

                        if(f) {
                            let fd: FileData = {projectID: m.id, fileID: f.id, required: undefined}
                            console.log(lfPrefix(" \\> Found Addition Candidate File: \"" + f.fileName + "\"\t\"" + lfFinfo(fd) + "\""))
                            filesToDOW.set(fd.projectID.toString(), fd)
                        } else {
                            console.warn(lfPrefix(" \\> No File Found"))
                        }
                    } else {
                        let fd = m as ModData
                        console.log(lfPrefix("  > Using Specified Addition Candidate File: \"" + lfFinfo(fd) + "\""))
                        filesToDOW.set(fd.projectID.toString(), fd)
                    }
                } else {
                    if(mod) {
                        console.warn(lfPrefix("  > Failed to find mod for " + mod.searchFilter))
                    } else {
                        console.warn(lfPrefix("  > Mod was undefined"))
                    }
                }
            })()
        )
    }

    await Promise.all(promises)
    

    return filesToDOW
}

