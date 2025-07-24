import React, { useState, useEffect, useRef } from 'react';
import { ref, uploadBytes, deleteObject, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseConfig';
function FileStorage() {
    const [currentPath, setCurrentPath] = useState('');
    const [filesAndFolders, setFilesAndFolders] = useState({ files: [], folders: [] });
    const [newFolderName, setNewFolderName] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef(null);
    useEffect(() => {
        listFilesAndFolders(currentPath);
    }, [currentPath]);
    const getFullPath = (name) => currentPath ? `${currentPath}/${name}` : name;
    const getFolderPathParts = (path) => path.split('/').filter(part => part !== '');
    const isMaxNestedLevelReached = (path) => getFolderPathParts(path).length >= 6;
    const previewFile = async (fileName) => {
        const filePath = getFullPath(fileName);
        const fileRef = ref(storage, filePath);
        try {
            const url = await getDownloadURL(fileRef);
            window.open(url, '_blank');
        } 
        catch (error) {
            console.error("Error previewing file:", error);
            setStatusMessage("Error previewing file: " + error.message);
        }
    };
    const shareFile = async (fileName) => {
        const filePath = getFullPath(fileName);
        const fileRef = ref(storage, filePath);
        try {
            const url = await getDownloadURL(fileRef);
            await navigator.clipboard.writeText(url);
            setStatusMessage("Link copied to clipboard.");
        }
        catch (error) {
            console.error("Error generating share link:", error);
            setStatusMessage("Failed to generate share link: " + error.message);
        }
    };
    const uploadFile = async () => {
        const file = fileInputRef.current.files[0];
        if (!file) return;
        const filePath = getFullPath(file.name);
        const fileRef = ref(storage, filePath);
        try {
            await uploadBytes(fileRef, file);
            fileInputRef.current.value = '';
            listFilesAndFolders(currentPath);
            setStatusMessage(`File "${file.name}" uploaded successfully.`);
        } 
        catch (error) {
            console.error("Error uploading file:", error);
            setStatusMessage("Error uploading file: " + error.message);
        }
    };
    const deleteFile = async (fileName) => {
        const filePath = getFullPath(fileName);
        const fileRef = ref(storage, filePath);
        try {
            await deleteObject(fileRef);
            listFilesAndFolders(currentPath);
            setStatusMessage(`File "${fileName}" deleted successfully.`);
        } 
        catch (error) {
            console.error("Error deleting file:", error);
            setStatusMessage("Error deleting file: " + error.message);
        }
    };
    const createFolder = async () => {
        const folderName = newFolderName.trim();
        if (!folderName) {
            setStatusMessage("Please enter a folder name.");
            return;
        }
        const folderPath = getFullPath(folderName);
        if (isMaxNestedLevelReached(folderPath)) {
            setStatusMessage("Maximum 6 nested folder levels allowed.");
            return;
        }
        const dummyFileRef = ref(storage, `${folderPath}/.keep`);
        try {
            await uploadBytes(dummyFileRef, new Blob([], { type: 'application/octet-stream' }));
            setNewFolderName('');
            listFilesAndFolders(currentPath);
            setStatusMessage(`Folder "${folderName}" created successfully.`);
        } 
        catch (error) {
            console.error("Error creating folder:", error);
            setStatusMessage("Error creating folder: " + error.message);
        }
    };
    const deleteFolder = async (folderName) => {
        const folderPathToDelete = getFullPath(folderName);
        try {
            await deleteFolderRecursive(folderPathToDelete);
            listFilesAndFolders(currentPath);
            setStatusMessage(`Folder "${folderName}" and its contents deleted successfully.`);
        } 
        catch (error) {
            console.error("Error deleting folder:", error);
            setStatusMessage("Error deleting folder: " + error.message);
        }
    };
    const deleteFolderRecursive = async (path) => {
        const folderRef = ref(storage, path);
        const listResult = await listAll(folderRef);
        const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
        listResult.prefixes.forEach(prefixRef => {
            deletePromises.push(deleteFolderRecursive(prefixRef.fullPath));
        });
        await Promise.all(deletePromises);
    };
    const enterFolder = (folderName) => {
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        const parts = getFolderPathParts(newPath);
        if (parts.length > 6) {
            setStatusMessage("Cannot navigate deeper. Maximum 6 nested folder levels allowed.");
            return;
        }
        setCurrentPath(newPath);
    };
    const goBack = () => {
        const parts = getFolderPathParts(currentPath);
        parts.pop();
        setCurrentPath(parts.join('/') || '');
    };
    const listFilesAndFolders = async (path) => {
        const listRef = ref(storage, path);
        try {
            const result = await listAll(listRef);
            const folders = result.prefixes.map(p => p.name).filter(n => n !== '.keep');
            const files = result.items.map(i => i.name).filter(n => n !== '.keep');
            setFilesAndFolders({ files, folders });
        } 
        catch (error) {
            console.error("Error listing files and folders:", error);
            setStatusMessage("Error listing files: " + error.message);
            setFilesAndFolders({ files: [], folders: [] });
        }
    };
    return (
        <div className="container">
            <h1>File Storage</h1>
            <div id="file-management">
                <h2>Current Path: <span id="currentPathDisplay">{currentPath === '' ? '/' : '/'+currentPath + '/'}</span></h2>
                <button onClick={goBack} disabled={currentPath === ''}>Go Back</button>
                <h3>Create Folder</h3>
                <input
                    type="text"
                    id="newFolderName"
                    placeholder="Enter new folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                />
                <button onClick={createFolder}>Create Folder</button>
                <h3>Upload File</h3>
                <input type="file" id="fileInput" ref={fileInputRef} />
                <button onClick={uploadFile}>Upload File</button>
                <h3>Files and Folders:</h3>
                <ul id="fileList">
                    {filesAndFolders.folders.length === 0 && filesAndFolders.files.length === 0 && (
                        <li>No files or folders in this directory.</li>
                    )}
                    {filesAndFolders.folders.map(folderName => (
                        <li key={folderName} className="folder-item">
                            <span onClick={() => enterFolder(folderName)}>📁 {folderName}</span>
                            <div>
                                <button onClick={() => deleteFolder(folderName)}>Delete</button>
                            </div>
                        </li>
                    ))}
                    {filesAndFolders.files.map(fileName => (
                        <li key={fileName} className="file-item">
                            <span>📄 {fileName}</span>
                            <div>
                                <button onClick={() => previewFile(fileName)}>Preview</button>
                                <button onClick={() => shareFile(fileName)}>Share</button>
                                <button onClick={() => deleteFile(fileName)}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
                {statusMessage && (
                    <div className="status-message">
                        <p>{statusMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
export default FileStorage;
