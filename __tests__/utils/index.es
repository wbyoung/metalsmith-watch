import fs from "fs"
import {sync as rm} from "rimraf"
import {sync as mkdirp} from "mkdirp"
import {normalize} from "path"

import watch from "../../src"

import Metalsmith from "metalsmith"

export function noop() {}
export function noopExceptErr(err) {
  if (err) {throw err}
}

const closers = {}

export function cleanTests(key) {
  closers[key]()
  // rm(`${__dirname}/../tmp-${key}`)
}

export function prepareTests(key, testCb, assertionCb, options, beforeWatch) {
  const folder = normalize(`${__dirname}/../tmp-${key}`)
  const metalsmith = new Metalsmith(folder)

  rm(folder)
  mkdirp(`${folder}/src`)
  fs.writeFileSync(`${folder}/src/dummy`, "")

  if (beforeWatch) {
    beforeWatch()
  }

  const watcherOpts = {
    log: noop,
    ...options,
  }

  let alreadyDone = false

  metalsmith
    .source("./src")
    .use(watch(watcherOpts))
    .build(err => {
      if (err) {throw err}

      metalsmith
        .use((files) => {
          if (alreadyDone) {
            throw new Error("This assertion block should not be called twice")
          }
          closers[key] = watcherOpts.close
          if (assertionCb !== noop) {
            alreadyDone = true
            assertionCb(files)
            // metalsmith write the builded files after this plugin
            setTimeout(() => cleanTests(key), 1000)
          }
        })
      setTimeout(() => testCb(), 1000)
    })

  return folder
}
