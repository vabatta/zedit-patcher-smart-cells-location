/* global info, xelib, registerPatcher, patcherUrl */

registerPatcher({
  info: info,
  gameModes: [xelib.gmSSE, xelib.gmTES5],
  settings: {
    label: info.name,
    hide: false,
    templateUrl: `${patcherUrl}/partials/settings.html`,
    defaultSettings: {
      title: info.name,
      patchFileName: 'Smart Patch.esp'
    }
  },
  // requiredFiles: [''],
  getFilesToPatch: filenames => {
    return filenames
  },
  execute: (patchFile, helpers, settings, locals) => ({
    initialize: () => {
      // initialize
      // measure the execution time
      locals.start = new Date()
      // get all locations records
      locals.LCTNs = helpers.loadRecords('LCTN')
        // and sort them alphabetically for binary search
        .sort((a, b) => {
          // sort alphabetically
          a = xelib.EditorID(a)
          b = xelib.EditorID(b)
          // compare and return
          if (a > b) return 1
          else if (a < b) return -1
          else return 0
        })
    },
    process: [{
      load: {
        signature: 'CELL',
        filter: record => {
          // get the winning override which has not a location setting
          return xelib.IsWinningOverride(record) && !xelib.HasElement(record, 'XLCN')
        }
      },
      patch: record => {
        // get the cell EDID
        const cellEDID = xelib.EditorID(record)

        // binary search through all locations
        let startIndex = 0
        let stopIndex = locals.LCTNs.length - 1
        // iterate until we need to stop
        while (startIndex <= stopIndex) {
          let currentIndex = (stopIndex + startIndex) >> 1
          // strip out 'Location' from the editor ID
          const location = xelib.GetWinningOverride(locals.LCTNs[currentIndex])
          const locationEDID = xelib.EditorID(location).replace('Location', '')
          // longest common starting substring between cell EDID and zone EDID
          let k = 0
          while (k < locationEDID.length && locationEDID.charAt(k) === cellEDID.charAt(k)) k++
          // check if the location is completely consumed
          if (k === locationEDID.length) {
            // found a location that matches the cell
            helpers.logMessage(`${cellEDID} => found ${xelib.EditorID(location)}`)
            // patch it
            xelib.AddElement(record, 'XLCN')
            xelib.SetLinksTo(record, location, 'XLCN')
            // exit the loop
            break
          }
          // look to where should we go
          if (cellEDID > locationEDID) startIndex = currentIndex + 1
          else if (cellEDID < locationEDID) stopIndex = currentIndex - 1
          // there won't be a location for this edid
          else break
        }
      }
    }],
    finalize: () => {
      // log the execution time
      locals.time = new Date() - locals.start
      helpers.logMessage(`Took ${locals.time / 1000} seconds`)
    }
  })
})
