# DirectoryOpus-UniversalOpen-plugin
A smart "open file" script.<br>
You can use it to create a keyboard shortcut or command to open a file with a program based on its extension or MIME type.<br>
It also allows specifying a particular command for managed or native DLLs or executables.<br>
The plugin uses `file.exe` utility to determine MIME type of a file.

# How to use (it is only one of the options)
* Download the script from the [Releases page](https://github.com/PolarGoose/DirectoryOpus-UniversalOpen-plugin/releases)
* Adjust the `Script configuration section` at the beginning of the script.
* Copy and paste the script file into the Directory Opus plugins folder `%AppData%\GPSoftware\Directory Opus\Script AddIns`
* Right click on the toolbar -> Customize -> Keys ->"New Lister Hotkey."
* Fill in `UniversalOpen` in the `Function` field.<br>
  <img src="doc/AddingNewHotkey.png" width="30%" />

# How the script works
* If nothing is selected or a folder is selected, the `folderOpeningProgram` is used.
* If an executable or DLL is selected, the script determines if it is a native or managed binary and uses `nativeExeOrDllHandlingProgram` or `managedExeOrDllHandlingProgram` accordingly.
* If a file is selected, the program uses its extension and checks the p'redefinedFileExtensions' table to find the appropriate program. If the program is not found, it retrieves the MIME type of the file and checks the `predefinedMimeTypes` table.

# Limitations
* UNC (the paths starting with `\\`) and FTP paths are not supported because `file.exe` can't access them.
