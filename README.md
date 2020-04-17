# uubmldraw-transform
Lists structured contents of UUBML PNG files and allows to replace icons in the PNG files.

# Usage
1. `npm install`
1. `node index.js <command> <command arguments> <UUBML PNG file>`
  
# Supported commands
* **list** - lists icons and connectors in the PNG file
  * `node index.js list test.png`
* **json** - extracts complete diagram JSON from the PNG file
  * `node index.js json test.png`
* **replace** - replaces all occurrences of an icon by another icon (the icons are specified using codes output by the **list** command)
  * `node index.js replace e0bf e04b test.png`
