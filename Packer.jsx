// Clutter everywhere
// Messy Messy Messy
// But no more! (hopefully)
// Bless this code
// Caleb Roenigk - 2025

// Init function, checks that there is an active comp to run packer on
function init() {
    if(app.project.activeItem instanceof CompItem) {
        packComp(app.project.activeItem, 1);
    } else {
        // Active project has no active comp
        alert("You must have a comp open to use Packer.");
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
        
        // Set the start time of the layer to the proper start time in the new precomp
        precompLayer.startTime = (precompLayer.inPoint - originalInPoint) + handleDuration;
        
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

init();