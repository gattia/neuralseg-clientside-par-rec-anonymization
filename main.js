function readFileAsync(file) {
    // read files and return contents
    // wrap in a promise so can run async await
    // otherwise, will end up skippping reading some files
    // if they are not completed in time. 
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsText(file)
    })
}

function anonymizeParRec(strResult, baseFilename){
    // strResult is a string ouputted by reading filereader. 
    // baseFilename is the filename used to name the file. 
    // parse strResult into individual lines.
    // const lines = strResult.split('\n')
    // build dict of syntax for lines to anonymize.
    const getRegExParGenInfo = (infoField) => {
        return new RegExp("(\.\\s+" + infoField + "\\s+:\\s+).+(\r?\\n)", "i")
    }
    const dictAnonFields = [
        ["Patient name", "$1Blinded$2"],
        ["Examination name", "$1Blinded$2"],
        ["Examination date/time", "$10000.00.00 / 00:00:00$2"],
        ["Acquisition nr", "$10$2"]

    ]

    dictAnonFields.forEach(([fieldName, blinding]) => {
        strResult = strResult.replace(getRegExParGenInfo(fieldName), blinding);
    });

    strResult = strResult.replace(
        new RegExp("(#\\s+Dataset name:\\s+).+(\r?\\n)", "i"),
        "$1" + baseFilename + "$2"
    );
    return strResult;
}

async function handleFileSelect(evt) {
    // iterate over files, read the file
    // get filename, file extension, and file contents
    const files = evt.target.files; // FileList object
    const editedFiles = [];
    const editedFilenames = [];

    // stuff for the progress bar
    const elem = document.getElementById("myBar");
    const downloadButton = document.getElementById("retriever")
    const zipPercentage = 20;
    let progress = 0;
    // step size is how much to increment for each step of the anonymization & then zip adding. 
    const stepSize = (100 - zipPercentage) / (files.length * 2);

    
    //iterate over all files
    console.log('Number of files: ' + files.length);
    for (i = 0; i < files.length; i++) {
        const reader = new FileReader();
        const filename = files[i].name;
        const filenameEnding = filename.substring(filename.lastIndexOf('.') + 1);
        console.log('Iteration: ' + i + '; Filename: ' + filename)
        // if the file ending is .PAR, then anonymize the file
        if (filenameEnding === "PAR"){
            // get base filename (without .PAR) & log it to console.
            // it has to end with PAR so remove the X # of 
            const baseFilename = filename.substring(0, filename.lastIndexOf(".PAR"));
            const result = await readFileAsync(files[i]).catch(console.log)
            // anonymize the result data & add it to the pre-defined array. 
            editedFiles.push(new Blob([anonymizeParRec(result, baseFilename)],
                                      {type: 'text/plain'}));
            editedFilenames.push(filename);
        }
        progress += stepSize;
        elem.style.width = progress + "%";
    }

    const zip = new JSZip();
    const folder = zip.folder("anonymized");
    for (i = 0; i < editedFiles.length; i++){
        console.log(editedFilenames[i]);
        console.log(editedFiles[i]);
        await folder.file(editedFilenames[i], editedFiles[i], {blob: true});
        progress += stepSize;
        elem.style.width = progress + "%";
    }
    // Generate the zip file asynchronously
    zippedFile = zip.generateAsync({type : "blob"})

    // add the final percentage to get to 100%
    progress += zipPercentage;
    elem.style.width = progress + "%";

    downloadButton.style.display = "block";

    return zippedFile;
}

function downloadZip(zippedFile){
    zippedFile
        // callback is just a placeholder. It can be nothing, or any other name
        .then(function callback(blob) {
            saveAs(blob, "anonymized.zip")
        })
}

function main(){
    // preallocated zipped file in this scope
    let zippedFile = null;

    // when upload pressed call handleFileSelect and
    // save in zippedFile
    document.getElementById('upload').addEventListener(
        'change', 
        (evt) => {
            zippedFile = handleFileSelect(evt)
        }, 
        false
    );
    // when download button clicked, pass zippedFile to 
    // the downloadZip function for downloading. 
    document.getElementById('download').addEventListener(
        'click', 
        () => {
            downloadZip(zippedFile);
        }, 
        false
    );

}

main();