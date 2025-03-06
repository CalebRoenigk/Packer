// Clutter everywhere
// Messy Messy Messy
// But no more! (hopefully)
// Bless this code
// Caleb Roenigk - 2025

var handleLength = loadSettings().handleLength; // Global handle duration value, loads custom or default setting!
var rootStructure = [];
var sectionFolder = "";
var sectionTemplateData = {};

/*
Code for Import https://scriptui.joonas.me — (Triple click to select): 
{"activeId":4,"items":{"item-0":{"id":0,"type":"Dialog","parentId":false,"style":{"enabled":true,"varName":"","windowType":"Palette","creationProps":{"su1PanelCoordinates":false,"maximizeButton":false,"minimizeButton":false,"independent":false,"closeButton":true,"borderless":false,"resizeable":false},"text":"Packer","preferredSize":[200,0],"margins":12,"orientation":"row","spacing":16,"alignChildren":["center","top"]}},"item-1":{"id":1,"type":"EditText","parentId":2,"style":{"enabled":true,"varName":"handleDuration","creationProps":{"noecho":false,"readonly":false,"multiline":false,"scrollable":false,"borderless":false,"enterKeySignalsOnChange":false},"softWrap":false,"text":"1","justify":"center","preferredSize":[32,0],"alignment":null,"helpTip":"duration of the handles in seconds"}},"item-2":{"id":2,"type":"Group","parentId":0,"style":{"enabled":true,"varName":"handleGroup","preferredSize":[0,0],"margins":0,"orientation":"row","spacing":4,"alignChildren":["left","fill"],"alignment":null}},"item-3":{"id":3,"type":"StaticText","parentId":2,"style":{"enabled":true,"varName":"handleLabel","creationProps":{"truncate":"none","multiline":false,"scrolling":false},"softWrap":false,"text":"Handles (s)","justify":"left","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-4":{"id":4,"type":"Button","parentId":0,"style":{"enabled":true,"varName":"packButton","text":"Pack it!","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}}},"order":[0,2,3,1,4],"settings":{"importJSON":true,"indentSize":false,"cepExport":false,"includeCSSJS":true,"showDialog":true,"functionWrapper":false,"afterEffectsDockable":false,"itemReferenceList":"None"}}
*/

// PALETTE
// =======
var palette = new Window("palette");
palette.text = "Packer";
palette.preferredSize.width = 200;
palette.orientation = "row";
palette.alignChildren = ["center","top"];
palette.spacing = 16;
palette.margins = 12;

// HANDLEGROUP
// ===========
var handleGroup = palette.add("group", undefined, {name: "handleGroup"});
handleGroup.orientation = "row";
handleGroup.alignChildren = ["left","fill"];
handleGroup.spacing = 4;
handleGroup.margins = 0;

var handleLabel = handleGroup.add("statictext", undefined, undefined, {name: "handleLabel"});
handleLabel.text = "Handles (s)";

var handleDuration = handleGroup.add('edittext {justify: "center", properties: {name: "handleDuration"}}');
handleDuration.helpTip = "duration of the handles in seconds";
handleDuration.text = handleLength;
handleDuration.preferredSize.width = 32;
handleDuration.onChange = function() {
    // When handle changes, update the global variable
    handleLength = parseFloat(handleDuration.text);
    // Check if conversion was successful
    if (isNaN(handleDuration.text)) {
        handleLength = 1.0;
    }
    // Save the handle changes to settings
    saveUserSettings(handleLength);
};

// TODO: Add option to number sections in order of appearance in timeline (as a checkbox?)

// PALETTE
// =======
// TODO: Make fancy custom button?
var packButton = palette.add("button", undefined, undefined, {name: "packButton"});
packButton.text = "Pack it!";
packButton.onClick = function() {
    init();
};

// TODO: At some point it would be nice to make a lil site like VOID has: https://battleaxe.co/void
// TODO: Would be nice to add a lil help/info button like VOID has!

palette.show();

// TODO: Make a freakin PANEL!!!!!!!

// Init function, checks that there is an active comp to run packer on
function init() {
    if(app.project.activeItem instanceof CompItem) {
        packComp(app.project.activeItem, handleLength);
    } else {
        // Active project has no active comp
        alert("You must have a comp selected to use Packer.");
    }
}

// Returns settings if the user has any for packer, if not, returns defaults
function loadSettings() {
    // Default settings
    var settings = {
        handleLength: 1 // Default handle length
    };
    
    // Check if user has custom settings
    if(app.settings.haveSetting("Packer", "handleLength")) {
        // User has custom settings
        settings['handleLength'] = parseFloat(app.settings.getSetting("Packer", "handleLength"));
    }

    // Load Packer Folder Settings
    loadPackerFolderSettings();
    
    return settings;
}

// Saves user settings
// hL: the duration of each handle on a packed precomp
function saveUserSettings(hL) {
    app.settings.saveSetting("Packer", "handleLength", String(hL));
}

// Loads the packer folder settings
function loadPackerFolderSettings() {
    var containingFolder = new Folder(new File($.fileName).parent.absoluteURI);

    // Check for the packer_folder_settings
    var packerFolderSettings = File(containingFolder.absoluteURI + "/packer_folder_settings.txt");
    var folderSettings = {};
    if(!packerFolderSettings.exists) {
        // TODO: Maybe we make more of a soft fallback here so that if the file does not exist, it can make the default file?
        alert("Please add packer_folder_settings.txt to the scripts folder: " + containingFolder.absoluteURI + "/");
    } else {
        packerFolderSettings.open("r");
        var jsonString = packerFolderSettings.read(); // Read file content as string
        packerFolderSettings.close();
        folderSettings = eval("(" + jsonString + ")");
    }
    
    rootStructure = folderSettings.root_structure;
    sectionTemplateData = folderSettings["section_template"];
}

// Creates the root folder structure
// rS: root structure
function createRootFolders(rS) {
    if(!isArray(rS)) {
        alert("Packer Folder Settings Root Structure is malformed. Expected array for root structure.");
        return app.project.rootFolder;
    }
    // Iterate over each top level item in the rootStructure
    for(var i=0; i < rS.length; i++) {
        // Iterative folder creation
        createFolders(rS[i], app.project.rootFolder);
    }
    
    // Find a reference to the insert_sections folder. If none found, return the root
    // Create an array of folder names that path to the folder where sections are inserted
    var foldersToSectionInsertion = getFolderNamesToTarget(rS, [], "insert_sections", true);
    
    // Get the reference folder for insert_sections
    var sectionInsertFolder = null;
    if(foldersToSectionInsertion === null) {
        // No folder found for insertion
        sectionInsertFolder = app.project.rootFolder;
    } else {
        // Iterate over the array of folder names to find the folder
        sectionInsertFolder = findFolderFromPath(foldersToSectionInsertion, app.project.rootFolder);
    }
    
    return sectionInsertFolder;
}

// Iterative folder creator from object
function createFolders(folderData, rootFolder) {
    // Create a folder with the folder name
    var folder = getOrCreateFolderAtDirectory(rootFolder, folderData.name);
    
    // Create folders for each folder within folder data
    for(var i=0; i < folderData.folders.length; i++) {
        createFolders(folderData.folders[i], folder);
    }
    
    return folder;
}

// Returns a bool if the object is an array or not
function isArray(obj) {
    return obj && obj.constructor === Array;
}

// Returns an array of folder names towards a folder given a target property
function getFolderNamesToTarget(folderData, path, targetPropertyName, targetPropertyValue) {
    for (var i = 0; i < folderData.length; i++) {
        var folder = folderData[i];
        var newPath = path.concat(folder.name); // Add current folder to path

        // If this folder has targetPropertyName and targetPropertyValue, return the path
        if (folder[targetPropertyName] === targetPropertyValue) {
            return newPath;
        }

        // Recursively search in subfolders
        if (folder.folders && folder.folders.length > 0) {
            var foundPath = getFolderNamesToTarget(folder.folders, newPath, targetPropertyName, targetPropertyValue);
            if (foundPath) {
                return foundPath; // Return as soon as a valid path is found
            }
        }
    }
    return null; // No matching folder found
}

// Find a folder via a chain of folder names, returns a reference to the folder
function findFolderFromPath(path, startDirectory) {
    var currentFolder = startDirectory;
    for(var i=0; i < path.length; i++) {
        var foundFolder = getFolderInDirectory(currentFolder, path[i]);
        
        if(foundFolder !== null) {
            currentFolder = foundFolder;
        } else {
            currentFolder = null;
            break;
        }
    }
    
    return currentFolder;
}

// Creates the template folder and returns a reference to the section template TODO: Fix the 'new' aspect
function createSectionTemplate(overwriteName) {
    var newSectionTemplateData = deepCopy(sectionTemplateData);
    newSectionTemplateData.name = overwriteName;
    // Create the section folders
    return createFolders(newSectionTemplateData, sectionFolder);
}

// Runs packer
// If the passed comp has selected layers in it, run packer only on the selected layers
// Else run packer on ALL layers in the passed comp
function packComp(comp, precompHandleDuration) {
    // Start an undo group so that the entire packing process can be undone easily
    app.beginUndoGroup("Packer");
    
    // Layers to run packer on
    var layersToPack = [];
    
    if(comp.selectedLayers.length > 0) {
        // The comp has selected layers, use these layers in the packing process
        layersToPack = comp.selectedLayers;
    } else {
        // The comp has no selected layers, use all layers in the comp in the packing process
        layersToPack = layerArrayFromLayerCollection(comp.layers);
    }
    
    // Group layers by similar colors
    var groupedLayers = groupLayersBySimilarColor(layersToPack);
    
    // Precompose each group of layers
    var precomps = precompLayerGroups(groupedLayers, precompHandleDuration);
    
    // For some reason we seem to have to hard reload the packer folder settings here :/
    loadPackerFolderSettings();

    // Create a folder structure for all precomps to exist in
    createCompsFolder();
    
    // Move all precomps into their own folders within the newly created folder structure
    makeFoldersForPrecomps(precomps);

    // Close the packer undo group
    app.endUndoGroup();
}

// Returns an array of layers given a layer collection object
// TBH, idk if we really need to do this but the documentation is lowkey horrible so this is just in case :)
function layerArrayFromLayerCollection(layerCollection) {
    var layers = [];

    for (var i = 1; i <= layerCollection.length; i++) {
        layers.push(layerCollection[i]);
    }
    
    return layers;
}

// Returns an array of grouped layers based on their layer color
// Grouped layers are based on their similar layer colors compared to their neighbors. EX: two green layers won't be grouped if there is a yellow layer between them
function groupLayersBySimilarColor(layers) {
    var groupedLayers = [[layers[0]]];
    
    var activeGroupLabelColor = layers[0].label;
    // Iterate over all the layers passed in, start with the second layer (index 1) because the first layer is already in the group array
    for(var i= 1; i < layers.length; i++) {
        var currentLayer = layers[i];
        
        // Check if the most recent group of layers is the same label as the current layer
        if(activeGroupLabelColor === currentLayer.label) {
            // The current layer is the same label as the active group, store the current layer in the existing group
            groupedLayers[groupedLayers.length - 1].push(currentLayer);
        } else {
            // The active group is a different label from the current layer
            // Create a new group of layers
            groupedLayers.push([currentLayer]);
            activeGroupLabelColor = currentLayer.label;
        }
    }
    
    return groupedLayers;
}

// Makes a precomp for each group of layers
// groupedLayers is an array of arrays of layers
// Returns an array of precomp references
function precompLayerGroups(groupedLayers, handleDuration) {
    var precomps = [];
    
    for(var i= groupedLayers.length - 1; i >= 0; i--) {
        var newPrecomp = precomposeLayers(groupedLayers[i], handleDuration);
        precomps.push(newPrecomp);
    }
    
    return precomps;
}

// Combines passed layer array layers into a single comp
// Returns a reference to the precomp
function precomposeLayers(layers, handleDuration) {
    // Store a reference to the active comp
    var comp = app.project.activeItem;
    
    // Use the name of the first layer as the precomp name
    // TODO: Maybe use the format <first layer name ... last layer name> instead?
    var precompName = layers[0].name;
    
    // Calculate the duration of the new precomp
    var precompDuration = getLayersDuration(layers) + (handleDuration * 2);

    // Create a new composition with the same settings as the original
    var precomp = app.project.items.addComp(precompName, comp.width, comp.height, comp.pixelAspect, precompDuration, comp.frameRate);
    
    // Move layers from the old comp into the new precomp
    moveLayersToPrecomp(comp, precomp, layers, handleDuration);
    
    return precomp;
}

// Returns the duration of an array of passed layers (calculated by using the earliest in-point and latest out-point from each layer)
function getLayersDuration(layers) {
    var layersDuration = 0;
    
    if (layers.length !== 0) {
        var minInPoint = getMinInPoint(layers); // Earliest start time
        var maxOutPoint = getMaxOutPoint(layers); // Latest end time

        layersDuration = maxOutPoint - minInPoint;
    }

    return layersDuration;
}

// Moves layers from a master comp to a new precomp
function moveLayersToPrecomp(masterComp, precomp, layers, handleDuration) {
    var precompLabel = layers[0].label; // Store the group label for later use
    var originalInPoint = getMinInPoint(layers); // Store the min in-point of the layers for later use
    var originalOutPoint = getMaxOutPoint(layers); // Store the max out-point of the layers for later use
    
    var layerIndices = []; // Store indices for later deletion from master comp
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        layerIndices.push(layer.index);

        // Make a copy of the current layer and move it into the new precomp
        masterComp.layer(layer.index).copyToComp(precomp);
        
        // Get a reference to the freshly copied layer
        var precompLayer = precomp.layer(1);
        
        // We need to 'square' the difference between the start time of the layer and the inPoint of the layer, we are expecting them to be identical but when they are not we need to add the difference to the new startTime
        var startPointDifference = masterComp.layer(layer.index).startTime - masterComp.layer(layer.index).inPoint;
        
        // Set the start time of the layer to the proper start time in the new precomp
        precompLayer.startTime = (precompLayer.inPoint - originalInPoint) + handleDuration + startPointDifference;
        
        // The following two if statements extend all layers at the start/end of the precomp into their respective handles
        // If this layer is at the end of the in-handle, extend the layer all the way to the left of the precomp
        if(precompLayer.startTime <= handleDuration) {
            precompLayer.inPoint = 0;
        }

        // If this layer ends at the start of the out-handle, extend the layer all the way to the right of the precomp
        if(precompLayer.outPoint >= precomp.duration - handleDuration) {
            precompLayer.outPoint = precomp.duration;
        }
    }
    
    // Set the work area of the precomp to exclude the handles
    precomp.workAreaStart = handleDuration;
    precomp.workAreaDuration = precomp.duration - (handleDuration * 2);
    
    // Flip the order of the layers in the precomp
    invertLayerOrderInComp(precomp);

    // Remove original layers (from highest index to lowest to avoid index shifting)
    layerIndices.sort(function(a, b) { return b - a; }); // Sort descending
    for (var j = 0; j < layerIndices.length; j++) {
        masterComp.layer(layerIndices[j]).remove();
    }

    // Add the new comp back as a layer in the original comp
    var precompLayer = masterComp.layers.add(precomp);
    
    // Position the precomp at the in-point of the first original layer minus the handle duration
    precompLayer.startTime = originalInPoint - handleDuration;
    
    // Color the precomp in the master comp based on the group's label
    precompLayer.label = precompLabel;
    
    // "Crop" the precomp so that its handles are 'hidden'
    precompLayer.inPoint = originalInPoint;
    precompLayer.outPoint = originalOutPoint;
}

// Flips the order of layers in a comp
function invertLayerOrderInComp(comp) {
    // Loop through the layers and move them in reverse order
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);  // Get the current layer
        layer.moveToBeginning();  // Move the layer to the top
    }
}

// Returns the minimum in-point of a given array of layers
function getMinInPoint(layers) {
    var minInPoint = layers[0].inPoint;

    // Loop through the layers to find the min in-point
    for (var i = 1; i < layers.length; i++) {
        var layer = layers[i];

        minInPoint = Math.min(minInPoint, layer.inPoint);
    }
    
    return minInPoint;
}

// Returns the maximum out-point of a given array of layers
function getMaxOutPoint(layers) {
    var maxOutPoint = layers[0].outPoint;

    // Loop through the layers to find the min in-point
    for (var i = 1; i < layers.length; i++) {
        var layer = layers[i];

        maxOutPoint = Math.max(maxOutPoint, layer.outPoint);
    }

    return maxOutPoint;
}

// Creates the main comps folder structure
function createCompsFolder() {
    // Iterate over the root structure and create folders and store a reference to the section location
    sectionFolder = createRootFolders(rootStructure);
    // Insert the packer section template into the section location
    createSectionTemplate(sectionTemplateData.name);
}

// Creates a folder if none exists at the parent directory, if one does exist this function returns a reference to it instead
function getOrCreateFolderAtDirectory(parentDirectory, folderName) {
    var proj = app.project; // Get the project
    
    var folder = getFolderInDirectory(parentDirectory, folderName);
    
    if(folder === null) {
        // The folder did not exist
        // Create the folder
        folder = proj.items.addFolder(folderName);
        folder.parentFolder = parentDirectory; // Move the new folder into the parent directory
    }
    
    return folder;
}

// Returns a reference to a folder if it exists in the directory, else returns null
function getFolderInDirectory(directory, folderName) {
    if(directory.numItems <= 0) {
        return null;
    }
    
    // Iterate over the items in the directory
    for(var i= 1; i <= directory.numItems; i++) {
        var item = directory.items[i];
        
        // Check if the item is a folder
        if(item instanceof FolderItem) {
            // Check the name of the folder
            if(item.name === folderName) {
                return item;
            }
        }
    }
    
    return null;
}

// Creates a folder for each precomp in the passed array
// TODO: Make this use the template or make the folder creation dynamic somehow?
function makeFoldersForPrecomps(precomps) {
    // Iterate over the precomps and make their folders
    for(var i=0; i < precomps.length; i++) {
        var precomp = precomps[i];
        
        // Create a new precomp folder
        var precompFolder = createSectionTemplate(precomp.name);
        precomp.parentFolder = precompFolder;
        
        // Move the precomp folder into the sections folder
        precompFolder.parentFolder = sectionFolder;
        
        // Move any precomp assets into the precomp folder
        relocatePrecompAssets(precomp, precompFolder);
    }
}

// Moves any layer assets in a precomp into a new directory
function relocatePrecompAssets(precomp, directory) {
    // Store a reference to each folder that corresponds to an asset type using asset data
    var assetFolders = getAssetFolders(directory);

    // Iterate over all layers in the precomp
    for(var i= 1; i < precomp.numLayers; i++) {
        var layer = precomp.layer(i);
        
        // Test if the layer has a source
        if(layerHasSource(layer)) {
            var layerType = getLayerType(layer);

            // TODO: Move any layers of type "Comp" into the precomps directory!!!!
            // TODO: Move audio into the correct folder!!!!
            switch(layerType) {
                case "AVLayer":
                    // Check what kind of avlayer it is and move it into the proper assets folder
                    var layerSourceFileType = layer.source.file.fsName.split('.').pop().toLowerCase();
                    if(layerSourceIsImage(layerSourceFileType)) {
                        layer.source.parentFolder = assetFolders.image;
                    } else {
                        layer.source.parentFolder = assetFolders.footage;
                    }
                    break;
                case "SolidLayer":
                case "ThreeDModelLayer":
                    // Move both of these sources into the misc asset folder
                    layer.source.parentFolder = assetFolders.misc;
                    break;
                default:
                    break;
            }
        }
    }
}

// Returns an object with references to each asset folder in the given directory using the section template data
function getAssetFolders(directory) {
    // Audio
    var audioPath = getFolderNamesToTarget(sectionTemplateData.folders, [], "asset_type", "audio");
    var audioFolder = findFolderFromPath(audioPath, directory);
    
    // Footage
    var footagePath = getFolderNamesToTarget(sectionTemplateData.folders, [], "asset_type", "footage");
    var footageFolder = findFolderFromPath(footagePath, directory);

    // Image
    var imagePath = getFolderNamesToTarget(sectionTemplateData.folders, [], "asset_type", "image");
    var imageFolder = findFolderFromPath(imagePath, directory);

    // Misc
    var miscPath = getFolderNamesToTarget(sectionTemplateData.folders, [], "asset_type", "misc");
    var miscFolder = findFolderFromPath(miscPath, directory);

    // Comp
    var compPath = getFolderNamesToTarget(sectionTemplateData.folders, [], "asset_type", "comp");
    var compFolder = findFolderFromPath(compPath, directory);
    
    var assetFoldersReference = {
        audio: audioFolder,
        footage: footageFolder,
        image: imageFolder,
        misc: miscFolder,
        comp: compFolder
    }
    
    return assetFoldersReference;
}

// Returns the type of an input layer as a string
function getLayerType(layer) {
    if (layer instanceof AVLayer) {
        return "AVLayer";
    } else if (layer instanceof TextLayer) {
        return "TextLayer";
    } else if (layer instanceof ShapeLayer) {
        return "ShapeLayer";
    } else if (layer instanceof CameraLayer) {
        return "CameraLayer";
    } else if (layer instanceof LightLayer) {
        return "LightLayer";
    } else if (layer instanceof ThreeDModelLayer) {
        return "ThreeDModelLayer";
    } else {
        return "UnknownLayer";
    }
}

// Returns true if the layer is of a type that has a source
function layerHasSource(layer) {
    var layerType = getLayerType(layer);
    
    switch(layerType) {
        case "AVLayer":
        case "ThreeDModelLayer":
            return true;
        default:
            return false;
    }
}

// Tests a string to determine if it is a file type that is an image format
function layerSourceIsImage(fileType) {
    // From the full list here:
    // https://helpx.adobe.com/after-effects/kb/supported-file-formats.html
    switch(fileType) {
        // Illustrator
        case "ai":
        case "eps":
        case "ps":
        // PDF
        case "pdf":
        // Photoshop
        case "psd":
        // Bitmap
        case "bmp":
        case "rle":
        case "dib":
        // Camera Raw
        case "tif":
        case "tiff":
        case "crw":
        case "nef":
        case "raf":
        case "orf":
        case "mrw":
        case "dcr":
        case "mos":
        case "raw":
        case "pef":
        case "srf":
        case "dng":
        case "x3f":
        case "cr2":
        case "erf":
        case "sr2":
        case "mfw":
        case "mef":
        case "arw":
        // Cineon
        case "cin":
        case "dpx":
        // CompuServe GIF
        case "gif":
        // RLA/RPF
        case "rla":
        case "rpf":
        // ElectricImage
        case "img":
        case "ei":
        // IFF
        case "iff":
        case "tdi":
        // JPEG
        case "jpg":
        case "jpe":
        case "jpeg":
        // HEIF
        case "heif":
        // Maya
        case "ma":
        // EXR
        case "exr":
        case "sxr":
        case "mxr":
        // PCX
        case "pcx":
        // PNG
        case "png":
        // HDR
        case "hdr":
        case "rgbe":
        case "xyze":
        // SGI
        case "sgi":
        case "bw":
        case "rgb":
        // Softimage
        case "pic":
        // Targa
        case "tga":
        case "vda":
        case "icb":
        case "vst":
            return true;
        default:
            return false;
    }
}

// Deep copies an input object
function deepCopy(obj) {
    // If the value is primitive (null, number, string, boolean), return as is
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    // If it's an array, copy each item recursively
    if (isArray(obj)) {
        var arrCopy = [];
        for (var i = 0; i < obj.length; i++) {
            arrCopy[i] = deepCopy(obj[i]);
        }
        return arrCopy;
    }

    // If it's an object, copy each property recursively
    var objCopy = {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            objCopy[key] = deepCopy(obj[key]);
        }
    }

    return objCopy;
}