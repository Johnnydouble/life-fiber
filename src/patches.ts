import { FileData, ObjectSet } from "./types";

import { SearchOptions } from "node-curseforge/dist/objects/types";

export { Patches, Diff }

/**Config Format:
 * {
 *  "additions": [
 *      {"file": {"projectID":"id", "fileID":"id"}},
 *      {"mod": {"projectName":"name", "mcver":"1.18", "exactmatch":true, "required": true}},
 *  ],
 *  "removals": [
 *      {"file": {"projectID":"id", "fileID":"id"}},
 *      {"mod": {"projectName":"name", "mcver":"1.18", "exactmatch":true, "required": true}},
 *  ]
 * }
 */

class Diff {
    fileData: ObjectSet<FileData>
    searches: Array<SearchOptions>
}
class Patches {
    additions: Diff
    removals: Diff

    constructor(additions: Diff, removals: Diff){
        this.additions = additions
        this.removals = removals
    }
    
    private static toDiff(changes: any) : Diff {
        const searches = new Array<SearchOptions>
        const fileData = new ObjectSet(changes.filter((change: any) => {
            if(change.file) {
                return true
            } else if(change.mod) {    
                searches.push(change.mod)
            }
            return false
        }))
        
        return {fileData: fileData, searches: searches} as Diff
    }

    static fromJSONString(jsonStr: string) {
        return Patches.fromJSON(JSON.parse(jsonStr))
    }

    static fromJSON(jsonObj: any) : Patches{
        return new Patches(Patches.toDiff(jsonObj.additions), Patches.toDiff(jsonObj.removals))
    }

    static fromJSONStringCommented(commentedJsonStr: string) {
        const jsonStr = commentedJsonStr.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
        return this.fromJSONString(jsonStr)
    }

}