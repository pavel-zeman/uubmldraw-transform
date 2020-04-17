let png = require("png-metadata");
let pako = require("pako");
let fs = require("fs");
let textEncoding = require("text-encoding"); 
let TextDecoder = textEncoding.TextDecoder;

const iconType = "UuBmlDraw.Diagramming.UuBmlDrawIcon";
const connectorType = "UuBmlDraw.Diagramming.UuBmlDrawConnector";
const pngChunk = "diagramJson";

/** Escapes non-ascii characters in the string */
function escapeString(input) {
  function padFour(input) {
      let result = "0000" + input;
      return result.substr(result.length - 4);
  }
  let output = "";
  for (let i = 0, l = input.length; i < l; i++)
    output += input.charCodeAt(i) <= 128 ? input.substr(i, 1) : padFour(input.charCodeAt(i).toString(16));
  return output;
}

/** Reads JSON data from given file */
function readData(fileName) {
  let file = png.readFileSync(fileName);
  let chunks = png.splitChunk(file);
  
  let jsonData = null;
  chunks.forEach((item) => {
    if (item.type === "tEXt") {
      let separatorIndex = item.data.indexOf("\0");
      if (separatorIndex > 0) {
        if (item.data.substr(0, separatorIndex) === pngChunk) {
          jsonData = item.data.substr(separatorIndex + 1);
        }
      }
    }
  });
  
  if (jsonData) {
    let buffer = Buffer.from(jsonData, "base64");
    let result = pako.inflate(buffer);
    let jsonText = new TextDecoder("utf-8").decode(result);
    return JSON.parse(jsonText);
  }
  
  console.log("No JSON data found in the file");
  process.exit(1);
}

/** Prints icons and connectors from the diagram */
function printContent(diagram) {
  console.log("Icons (item description, description, importance, icon):");
  diagram.items.forEach((item, index) => {
    if (item.__type === iconType) {
      let descriptionItem = diagram.items.find(item2 => item2.instanceId === item.textDescriptionId &&  item2.__type === "UuBmlDraw.Diagramming.UuBmlDrawTextDescription"); 
      let description = descriptionItem ? descriptionItem.text.replace("\n", " ") : null;
      console.log(`  ${item.description.replace("\n", " ")} - ${description} - ${item.importance} - ${escapeString(item.icon.substr(0, 1))}`);
    }
  });
  console.log("\nConnectors (relation, type):");
  diagram.items.forEach((item) => {
    if (item.__type === connectorType) {
      console.log(`  ${item.relation} - ${item.type}`);
    }
  });
}

/** Replaces icon from replaceFrom to replaceTo in diagram and writes result to fileName */
function replace(fileName, diagram, replaceFrom, replaceTo) {
  // Replace the icons in JSON
  let totalReplacements = 0;
  diagram.items.forEach((item, index) => {
    if (item.__type === iconType) {
      let icon = item.icon.charCodeAt(0);
      if (icon === replaceFrom) {
        totalReplacements++;
        item.icon = String.fromCharCode(replaceTo) + item.icon.substr(1, 15) + String.fromCharCode(replaceTo - 1) + item.icon.substr(17);
        item.text = item.icon;
      }
    }
  });
  console.log(`Replaced ${totalReplacements} occurrences`);
  
  // Compress the JSON
  let buffer = Buffer.from(JSON.stringify(diagram), "utf8");
  let compressedBuffer = Buffer.from(pako.deflate(buffer)).toString("base64");

  // Save the JSON to PNG  
  let file = png.readFileSync(fileName);
  let chunks = png.splitChunk(file);
  let newChunk = null;
  let newChunkPos = 0;
  chunks.forEach((item, index) => {
    if (item.type === "tEXt") {
      let separatorIndex = item.data.indexOf("\0");
      if (separatorIndex > 0) {
        if (item.data.substr(0, separatorIndex) === pngChunk) {
          item.data = pngChunk + "\0" + compressedBuffer;
          newChunkPos = index;
          newChunk = png.createChunk(item.type, item.data);          
        }
      }
    }
  });
  chunks[newChunkPos] = newChunk;
  fs.writeFileSync(fileName, png.joinChunk(chunks), "binary");
}


let args = process.argv.slice(2);
let command = args[0];
let replaceFrom = null;
let replaceTo = null;
let diagram = null;
switch (command) {
  case "list":
    diagram = readData(args[1]);
    printContent(diagram);    
    break;
  case "json":
    diagram = readData(args[1]);
    console.log(JSON.stringify(diagram));
    break;
  
  case "replace":
    replaceFrom = parseInt(args[1], 16);
    replaceTo = parseInt(args[2], 16);
    diagram = readData(args[3]);
    replace(args[3], diagram, replaceFrom, replaceTo);
    break;

  default:
    console.log("Usage:");
    console.log("node index.js list <PNG file name> - Lists all icons and connectors in the given file");
    console.log("node index.js json <PNG file name> - Extracts complete diagram JSON");
    console.log("node index.js replace <source icon> <target icon> <PNG file name> - Replaces icons in the PNG file (the icons are defined using hexadecimal strings as output by the list command)");
    
    process.exit(1);
    break;
}



