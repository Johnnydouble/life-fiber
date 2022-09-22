export { FileData, LFConfig, NumberCrushable, ObjectSetNC, ObjectSet }

class FileData {
    projectID: number;
    fileID: number;
    required?: boolean;

    constructor (projectID: number, fileID: number, required: boolean) {
        this.projectID = projectID
        this.fileID = fileID
        this.required = required
    }

    crush() : number {
        return +this.required + this.fileID * 10 + this.projectID * Math.pow(10, getDigits(+this.fileID)) + 1
    }
}

type FileMap = Map<string, FileData>

class LFConfig {
    files: FileMap;
    modLoader: string;
    packName: string;
    gameVersion: string;
    
    private static toFileMap(files: any) : FileMap { 
        return new Map(files.map((file: any) => [file.projectID.toString(), {fileID: file.fileID, projectID: file.projectID, required: file.required} as FileData]));
    }

    constructor(files: FileMap, gameVersion: string, modLoader: string, packName: string) {
        this.files = files
        this.gameVersion = gameVersion
        this.modLoader = modLoader
        this.packName = packName
    }

    static fromJSONString(jsonStr: string) : LFConfig{
        return LFConfig.fromJSON(JSON.parse(jsonStr))
    }
    static fromJSON(jsonObj: any) : LFConfig{
        const files = this.toFileMap(jsonObj.files)
        let modLoader: string = jsonObj.minecraft.modLoaders.filter((loader: any) => loader.primary)[0].id
        modLoader = modLoader.substring(0, modLoader.indexOf('-'))
        return new LFConfig(files, jsonObj.minecraft.version, modLoader, jsonObj.name)
    }
}


class ObjectSet<T> {
    map: Map<string, T>

    constructor(values: Iterable<T> | T | void){
        this.map = new Map<string, T>
        if(!values) {
            return
        }

        if(typeof values[Symbol.iterator] === 'function') {
            for (const item of (values) as Iterable<T>) {
                this.add(item)
            }
        } else {
            this.add(values as T)
        }
    }

    add(value: T) : boolean {
        const str = JSON.stringify(value)
        if(this.map.has(str)) {
            return false
        } else {
            this.map.set(str, value)
            return true
        }
    }

    has(value: T) : boolean {
        return this.map.has(JSON.stringify(value))
    }

    delete(value: T) : boolean {
        return this.map.delete(JSON.stringify(value))
    }
}

interface NumberCrushable {
	crush(): number;
}

class ObjectSetNC<T extends NumberCrushable> {
    map: Map<number, T>

    constructor(values: Iterable<T> | T | void){
        this.map = new Map<number, T>
        if(!values) {
            return
        }

        if(typeof values[Symbol.iterator] === 'function') {
            for (const item of (values) as Iterable<T>) {
                this.add(item)
            }
        } else {
            this.add(values as T)
        }
    }

    add(value: T) : boolean {
        const num = value.crush()
        if(this.map.has(num)) {
            return false
        } else {
            this.map.set(num, value)
            return true
        }
    }

    has(value: T) : boolean {
        return this.map.has(value.crush())
    }

    delete(value: T) : boolean {
        return this.map.delete(value.crush())
    }
}

function getDigits(num: number) : number {
    return Math.floor(Math.log10(num)) + 1
}