export { FileData }

class FileData {
    projectID: number;
    fileID: number;
    required: boolean;

    constructor (projectID: number, fileID: number, required: boolean) {
        this.projectID = projectID
        this.fileID = fileID
        this.required = required
    }
}