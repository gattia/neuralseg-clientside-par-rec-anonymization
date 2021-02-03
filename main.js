var progress = 0;
var elem = document.getElementById("myBar");
var zipPercentage = 20;
var downloadButton = document.getElementById("retriever")
var zippedFile = null;

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
    const lines = strResult.split('\n')
    // build dict of syntax for lines to anonymize. 
    const dictAnonLines = {
        "# Dataset name:": "# Dataset name: " + baseFilename,
        ".    Patient name                       :" : ".    Patient name                       :   Blinded",
        // the below line may or may not have identifiable information. It is reasonably likely too.
        // this line is therefore being blinded by default. 
        ".    Examination name                   :" : ".    Examination name                   :   Blinded",
        // the below line could posisbly have identifiable information, but maybe not? Add option to omit? 
        // ".    Protocol name                      :" : ".    Protocol name                      :   Blinded",
        ".    Examination date/time              :" : ".    Examination date/time              :   0000.00.00 / 00:00:00",
        ".    Acquisition nr                     :" : ".    Acquisition nr                     :   0",
    }
    // iterate over every line in file.
    lines.forEach(function(line, idx, linesArray){
        for (const [key, value] of Object.entries(dictAnonLines)){
            // if line includes the key then replace it.          
            if (line.includes(key)){
                // replace the line with the value at the key.
                lines[idx] = value;
            }
        }
    });

    return lines.join("\n");
}

async function handleFileSelect(evt) {
    // iterate over files, read the file
    // get filename, file extension, and file contents
    let files = evt.target.files; // FileList object
    let editedFiles = [];
    let editedFilenames = [];
    let filename = '';
    let filenameEnding = '';
    let baseFilename = '';
    let result = '';
    
    // step size is how much to increment for each step of the anonymization & then zip adding. 
    let stepSize = (100 - zipPercentage) / (files.length * 2);

    let reader = new FileReader();
    //iterate over all files
    console.log('Number of files: ' + files.length);
    for (i = 0; i < files.length; i++) {
        console.log('Iteration: ' + i)
        filename = files[i].name;
        filenameEnding = filename.substring(filename.lastIndexOf('.') + 1);
        // if the file ending is .PAR, then anonymize the file
        if (filenameEnding === "PAR"){
            // get base filename (without .PAR) & log it to console. 
            baseFilename = filename.substring(0, filename.lastIndexOf(".PAR"));
            try {
                // call readFileAsync w/ await to ensure file is read
                // return result as a text string. 
                result = await readFileAsync(files[i]);
            } catch(err) {
                console.log(err);
            }
            // anonymize the result data & add it to the pre-defined array. 
            editedFiles.push(new Blob([anonymizeParRec(result, baseFilename)], {type: 'text/plain'}));
            editedFilenames.push(filename);
        }
        progress += stepSize;
        elem.style.width = progress + "%";
    }

    var zip = new JSZip();
    const folder = zip.folder("anon");
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

    // return zippedFile;
}

function downloadZip(evt){
    zippedFile
    // callback is just a placeholder. It can be nothing, or any other name
    .then(function callback(blob) {
        saveAs(blob, "anonymized.zip")
    })
}

document.getElementById('upload').addEventListener('change', handleFileSelect, false);
document.getElementById('download').addEventListener('click', downloadZip, false);