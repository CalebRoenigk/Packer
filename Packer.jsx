﻿// Clutter everywhere
// Messy Messy Messy
// But no more! (hopefully)
// Bless this code
// Caleb Roenigk - 2025

var handleLength = 1.0; // Global handle duration value

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
handleDuration.text = "1";
handleDuration.preferredSize.width = 32;
handleDuration.onChange = function() {
    // When handle changes, update the global variable
    handleLength = parseFloat(handleDuration.text);

    // Check if conversion was successful
    if (isNaN(userInput)) {
        handleLength = 1.0;
    }
    
    // TODO: Save the handle changes to a user settings file, also TODO: When starting up the script, load the user setting into this box
};

// PALETTE
// =======
// TODO: Make fancy custom button?
var packButton = palette.add("button", undefined, undefined, {name: "packButton"});
packButton.text = "Pack it!";
packButton.onClick = function() {
    init();
};

// TODO: At some point it would be nice to make a lil site like VOID has: https://battleaxe.co/void

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
// Comps > Sections > (TEMPLATE)
// TODO: Make this shit dynamic?
function createCompsFolder() {
    var proj = app.project; // Get the project
    
    // Create or find the comps folder
    var compsFolder = getOrCreateFolderAtDirectory(proj.rootFolder, "Comps");
    
    // Create the sections folder
    var sectionsFolder = getOrCreateFolderAtDirectory(compsFolder, "Sections");
    sectionsFolder.parentFolder = compsFolder;
    
    // Create the section template
    var existingTemplate = getFolderInDirectory(sectionsFolder, "<Section Name>"); // Check if there is a section template already in the sections folder
    if(existingTemplate === null) {
        // Section template doesn't exist
        var sectionTemplate = createSectionTemplate();
        sectionTemplate.parentFolder = sectionsFolder;
    }
}

// Creates a section template folder group and returns a reference to the root template folder
function createSectionTemplate() {
    // TODO: Make this shit dynamic?
    var proj = app.project; // Get the project

    // Create the root folder
    var rootTemplateFolder = proj.items.addFolder("<Section Name>");
    
    // Create the assets folder
    var assetsFolder = proj.items.addFolder("Assets");
    // Create all the subfolders for assets
    var audioAssetsFolder = proj.items.addFolder("Audio");
    var footageAssetsFolder = proj.items.addFolder("Footage");
    var imagesAssetsFolder = proj.items.addFolder("Images");
    var miscAssetsFolder = proj.items.addFolder("Misc");
    
    // Move the assets subfolders into assets
    audioAssetsFolder.parentFolder = assetsFolder;
    footageAssetsFolder.parentFolder = assetsFolder;
    imagesAssetsFolder.parentFolder = assetsFolder;
    miscAssetsFolder.parentFolder = assetsFolder;
    
    // Create the precomps folder
    var precompsFolder = proj.items.addFolder("Precomps");
    
    // Move the assets and precomps folders into the root template folder
    assetsFolder.parentFolder = rootTemplateFolder;
    precompsFolder.parentFolder = rootTemplateFolder;
    
    return rootTemplateFolder;
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
    // Get a reference to the sections folder
    var sectionsFolder = getFolderInDirectory(getFolderInDirectory(app.project.rootFolder, "Comps"), "Sections"); // TODO: Make this dynamic?
    
    // Iterate over the precomps and make their folders
    for(var i=0; i < precomps.length; i++) {
        var precomp = precomps[i];
        
        // Create a new precomp folder
        var precompFolder = createSectionTemplate(); // TODO: Make this dynamic?
        precompFolder.name = precomp.name;
        precomp.parentFolder = precompFolder;
        
        // Move the precomp folder into the sections folder
        precompFolder.parentFolder = sectionsFolder;
        
        // Move any precomp assets into the precomp folder
        relocatePrecompAssets(precomp, precompFolder); // TODO: Woooweee this is gonna be harder to make dynamic but we need to dooo itttttttt!
    }
}

// Moves any layer assets in a precomp into a new directory
function relocatePrecompAssets(precomp, directory) {
    // Store a reference to the assets folder
    var assetsFolder = getFolderInDirectory(directory, "Assets");
    
    // Iterate over all layers in the precomp
    for(var i= 1; i < precomp.numLayers; i++) {
        var layer = precomp.layer(i);
        
        // Test if the layer has a source
        if(layerHasSource(layer)) {
            var layerType = getLayerType(layer);
            
            switch(layerType) {
                case "AVLayer":
                    // Check what kind of avlayer it is and move it into the proper assets folder
                    var layerSourceFileType = layer.source.file.fsName.split('.').pop().toLowerCase();
                    if(layerSourceIsImage(layerSourceFileType)) {
                        var imageAssetFolder = getFolderInDirectory(assetsFolder, "Images");
                        layer.source.parentFolder = imageAssetFolder;
                    } else {
                        var footageAssetFolder = getFolderInDirectory(assetsFolder, "Footage");
                        layer.source.parentFolder = footageAssetFolder;
                    }
                    break;
                case "SolidLayer":
                case "ThreeDModelLayer":
                    // Move both of these sources into the misc asset folder
                    var miscAssetFolder = getFolderInDirectory(assetsFolder, "Misc");
                    layer.source.parentFolder = miscAssetFolder;
                    break;
                default:
                    break;
            }
        }
    }
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