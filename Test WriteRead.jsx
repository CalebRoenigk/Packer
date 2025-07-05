var defaultPackerSettings = '{\n' +
	'    root_structure: [\n' +
	'        {\n' +
	'            name: "Comps",\n' +
	'            folders: [\n' +
	'                {\n' +
	'                    name: "Sections",\n' +
	'                    insert_sections: true,\n' +
	'                    folders: []\n' +
	'                }\n' +
	'            ]\n' +
	'        }\n' +
	'    ],\n' +
	'    section_template: {\n' +
	'        name: "<Section Name>",\n' +
	'        folders: [\n' +
	'            {\n' +
	'                name: "Assets",\n' +
	'                asset_type: "assets",\n' +
	'                folders: [\n' +
	'                    {\n' +
	'                        name: "Audio",\n' +
	'                        asset_type: "audio",\n' +
	'                        folders: []\n' +
	'                    },\n' +
	'                    {\n' +
	'                        name: "Footage",\n' +
	'                        asset_type: "footage",\n' +
	'                        folders: []\n' +
	'                    },\n' +
	'                    {\n' +
	'                        name: "Images",\n' +
	'                        asset_type: "image",\n' +
	'                        folders: []\n' +
	'                    },\n' +
	'                    {\n' +
	'                        name: "Misc",\n' +
	'                        asset_type: "misc",\n' +
	'                        folders: []\n' +
	'                    },\n' +
	'                ]\n' +
	'            },\n' +
	'            {\n' +
	'                name: "Precomps",\n' +
	'                asset_type: "comp",\n' +
	'                folders: []\n' +
	'            }\n' +
	'        ]\n' +
	'    }\n' +
	'}';

// Reads user data from file
function readUserDataFromFile(filepath) {
	var file = new File(filepath);

	// Default encoding; can change
	file.encoding = "UTF-8";

	if (!file.exists) {
		return null;
	}

	file.open();
	var contents = file.read();
	file.close();

	return contents;
}

// Writes data to user data file
function writeUserDataToFile(filepath, data) {
	var file = new File(filepath);

	// Default encoding; can change
	file.encoding = "UTF-8";

	// Append to file
	file.open("w");
	var success = file.write(data);
	file.close();

	if (!success) {
		throw "Could not write to file '" + String(file.fsName);
	}
	
	return data;
}

// Creates a folder at the specified path on the system
function createSystemFolder(folderName, path) {
	// Create a new File object pointing to the desired folder
	var targetFolder = new Folder(path + "/" + folderName);

	// Check if it exists; if not, create it
	if (!targetFolder.exists) {
		var created = targetFolder.create();
		if (!created) {
			alert("Failed to create Packer folder at User Data path. Submit a ticket on AEScripts for help.");
			return null;
		}
	}
	
	return targetFolder;
}

// Returns "parsed JSON" from packer settings if possible
function parsePackerSettings(data) {
	var folderSettings = {};
	try {
		folderSettings = eval("(" + data + ")");
		if (!(typeof folderSettings === "object" && folderSettings !== null)) {
			alert("packer_folder_settings.txt seems to have an error in it. Please fix!");
			return null;
		}
	} catch (e) {
		alert("packer_folder_settings.txt seems to have an error in it. Please fix!");
		return null;
	}
	
	return folderSettings;
}

// Checks if the script can read/write
function checkSecurityPrefEnabled() {
	// This checks if scripting file/network access is enabled
	var isRWEnabled = app.preferences.getPrefAsLong(
		"Main Pref Section",
		"Pref_SCRIPTING_FILE_NETWORK_SECURITY"
	);

	return isRWEnabled === 1;
}

// Reads the user prefs for packing files
// Returns user packing prefs. If none exist on the system, this function creates a default set of prefs
function readUserPackingPrefs() {
	if(!checkSecurityPrefEnabled()) {
		alert("Please enable 'Allow Scripts to Write Files and Access Network' in Preferences > Scripting & Expressions.");
		return;
	}
	
	// Get the current packer settings
	var packerSettingsFolder = createSystemFolder("Packer", Folder.userData.fullName);
	var packerSettingsPath = packerSettingsFolder.fullName + "/packer_folder_settings.txt";
	var packerSettingsData = readUserDataFromFile(packerSettingsPath);
	
	if(packerSettingsData == null) {
		// Create default settings
		packerSettingsData = writeUserDataToFile(packerSettingsPath, defaultPackerSettings)
	}
	
	// Parse the settings into a JSON Object
	var packerSettingsParsed = parsePackerSettings(packerSettingsData);
	// TODO: Uncomment
	// rootStructure = packerSettingsParsed.root_structure;
	// sectionTemplateData = packerSettingsParsed["section_template"];
}

readUserPackingPrefs();