// --- Script configuration section ---

// Adjust this path if the file utility is installed in a different location.
// This utility is used to determine a file's MIME type.
// You can obtain this utility by installing Git for Windows: https://git-scm.com/download/win
var fileExe = "%ProgramFiles%/Git/usr/bin/file.exe"

// Specifies the program to use for native DLL or EXE files.
// For instance, you can use one of the following applications:
// * https://github.com/lucasg/Dependencies
// * https://mh-nexus.de/en/hxd
var nativeExeOrDllHandlingProgram = "C:/my/apps/Dependencies/DependenciesGui.exe"

// Specifies the program to use for managed DLL or EXE files.
// For instance, you can use one of the following applications:
// * https://www.jetbrains.com/decompiler/
// * https://github.com/icsharpcode/ILSpy
var managedExeOrDllHandlingProgram = "C:/my/apps/ILSpy/ILSpy.exe"

// Specifies the program to use for opening a folder.
var folderOpeningProgram = "%LocalAppData%/Programs/Microsoft VS Code/Code.exe"

// Specifies the program to be used for a specific file extension
var predefinedFileExtensions = [
  [ ["zip", "7z", "tar", "gz" ], "%ProgramFiles%/7-Zip/7zFM.exe"                              ],
  [ ["lnk"                    ], "C:/my/apps/Easy.Link.File.Viewer/Easy Link File Viewer.exe" ],
  [ ["msi"                    ], "C:/my/apps/lessmsi/lessmsi-gui.exe"                         ]]

// Specifies the program to use for a specific file's MIME type.
// To determine a file's MIME type, use the command `file.exe --brief --mime-type <file_path>`.
var predefinedMimeTypes = [
  [ ["application\/pdf"                                     ], "%ProgramData%/Microsoft/Windows/Start Menu/Programs/Adobe/Acrobat Reader DC.lnk" ],
  [ ["text\/.*", "inode\/x-empty", "application/javascript" ], "%LocalAppData%/Programs/Microsoft VS Code/Code.exe"                              ],
  [ ["image\/.*"                                            ], "C:/my/apps/iview/i_view64.exe"                                                   ]]

// ------

var shell = new ActiveXObject("WScript.shell");
var fsu = DOpus.FSUtil();
var stt = DOpus.Create().StringTools()
var fso = new ActiveXObject("Scripting.FileSystemObject")

function OnInit(/* ScriptInitData */ data) {
  data.name = "Universal open"
  data.desc = "Open a file with a program determined by its extension or MIME type"
  data.default_enable = true
  data.config_desc = DOpus.NewMap()
  data.config.debug = false
  data.config_desc("debug") = "Print debug messages to the script log";
  data.version = "0.0-dev";

  var cmd = data.AddCommand()
  cmd.name = "UniversalOpen"
  cmd.method = "onCommandExecuted"
  cmd.desc = data.desc
  cmd.label = data.desc
}

function onCommandExecuted(/* ScriptCommandData */ data) {
  var selectedFiles = data.func.sourcetab.selected_files
  var selectedFolders = data.func.sourcetab.selected_dirs
  debug("OnCommandExecuted: number of selected files = " + selectedFiles.Count + "; number of selected folders = " + selectedFolders.Count)

  if (selectedFolders.Count == 1 ) {
    var selectedFolder = getFirstElementOfCollection(selectedFolders)
    launch(folderOpeningProgram, selectedFolder)
    return
  }

  if (selectedFolders.Count == 0 && selectedFiles.Count == 0) {
    launch(folderOpeningProgram, data.func.sourcetab.path)
    return
  }

  if (selectedFiles.Count != 1) {
    debug("Do nothing. This command works only when 1 file or folder is selected")
    return
  }

  try {
    var selectedFile = getFirstElementOfCollection(selectedFiles)
    openFileUsingTheMostAppropriateProgramm(selectedFile)
  }
  catch (error) {
    var dlg = data.func.sourcetab.dlg
    dlg.message = error;
    dlg.buttons = "OK";
    dlg.icon = "error";
    dlg.show()
  }
}

function openFileUsingTheMostAppropriateProgramm(/* Item */ file) {
  debug("openFileUsingTheMostAppropriateProgramm. File information: ext:'" + file.ext + "' realpath:'" + file.realpath + "'")

  if(!hasReadPermission(file.realpath)) {
    throw "No read permission for the file"
  }

  if (file.ext === ".exe" || file.ext === ".dll") {
    handleExeAndDllFiles(file)
    return
  }

  var program = tryToFindProgramUsingExtension(file.ext)
  if (program) {
    launchProgram(program, file)
    return
  }

  debug("Couldn't find a program using extension. Checking the mime type of the file")
  var mimeType = getFileMimeType(file.realpath)
  debug("mime type of the file is '" + mimeType + "'")

  program = tryToFindProgramUsingMimeType(mimeType)
  if (program) {
    launchProgram(program, file)
    return
  }

  throw "No matching program found: extension='" + file.ext +"' mime-type='" + mimeType + "'"
}

function launchProgram(program, file) {
  if (typeof program === 'function') {
    program(file.realpath)
    return
  }
  launch(program, file.realpath)
}

function getFirstElementOfCollection(collection) {
  var e = new Enumerator(collection)
  e.moveFirst()
  return e.item()
}

function tryToFindProgramUsingExtension(extension) {
  for (var i = 0; i < predefinedFileExtensions.length; i++) {
    for(var j = 0; j < predefinedFileExtensions[i][0].length; j++) {
      if("." + predefinedFileExtensions[i][0][j] === extension) {
        return predefinedFileExtensions[i][1]
      }
    }
  }
  return null
}

function tryToFindProgramUsingMimeType(mimeType) {
  for (var i = 0; i < predefinedMimeTypes.length; i++) {
    for(var j = 0; j < predefinedMimeTypes[i][0].length; j++) {
      if(new RegExp(predefinedMimeTypes[i][0][j]).test(mimeType)) {
        return predefinedMimeTypes[i][1]
      }
    }
  }
  return null
}

function getFileMimeType(/* Path */ filePath) {
  // file.exe tool doesn't work for ftp and UNC paths
  if (filePath.pathpart.substr(0, 2) === "\\\\" || filePath.pathpart.substr(0, 3) === "ftp") {
    throw "UNC or FTP paths are not supported"
  }

  var command = '"' + fileExe + '"' + ' --brief --mime-type "' + filePath + '"'
  debug("shell.exec " + command)
  var output = runCommandAndReturnOutput(command)
  if (output.indexOf("cannot open") === 0) {
    throw "File.exe failed. Output of File.exe: " + output
  }
  return output
}

function handleExeAndDllFiles(exeOrDllFile) {
  if (isManagedExeOrDll(exeOrDllFile) === true) {
    launch(managedExeOrDllHandlingProgram, exeOrDllFile)
    return
  }
  launch(nativeExeOrDllHandlingProgram, exeOrDllFile)
}

function isManagedExeOrDll(exeOrDllFileFullName) {
  var command = "powershell.exe -ExecutionPolicy Bypass -Command [System.Reflection.AssemblyName]::GetAssemblyName(\\\"" + exeOrDllFileFullName + "\\\")"
  debug("excecute: " + command)
  var res = shell.run(command, 0, true);
  return res === 0;
}

function hasReadPermission(/* Path */ filePath) {
  try {
    var file = fso.OpenTextFile(filePath, 1, false)
    file.Close()
    return true
  } catch (e) {
    return false
  }
}

function launch(executableFullName, fileFullName) {
  var command = '"' + executableFullName + '" "' + fileFullName + '"'
  debug("launch: " + command)
  shell.run(command);
}

function runCommandAndReturnOutput(/* string */ command) {
  var tempFileFullName = fsu.GetTempFilePath()
  var cmdLine = 'cmd.exe /c "' + command + ' > "' + tempFileFullName + '""'
  debug("shell.run " + cmdLine)

  try {
    var exitCode = shell.run(cmdLine, 0, true)
    if (exitCode !== 0) {
      throw "Failed to execute the command. ExitCode=" + exitCode
    }
    return readAllText(tempFileFullName)
  }
  finally {
    fso.DeleteFile(tempFileFullName)
  }
}

function readAllText(/* string */ fileFullName) {
  var handle = fsu.OpenFile(fileFullName)
  var content = stt.Decode(handle.Read(), "utf8")
  handle.Close()
  return content
}

function debug(text) {
  if (Script.config.debug) {
    DOpus.Output(text);
  }
}
