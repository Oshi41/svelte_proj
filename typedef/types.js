/**
 * @typedef {Object} TreeFile
 * @property {string} filename - base name
 * @property {string} fullpath - full path using as ID
 * @property {Array<'selenium' | 'mocha' | 'folder' | 'ignored' | 'running' | 'selenium' | 'cvs_changed' | 'hidden'>} types
 * mocha - file contains mocha tests / directory contains files with mocha test
 * selenium - file contains selenium tests / directory contains files with selenium test
 * ignored - file/folder added to use ignored list
 * running - test is running / dir contains running tests
 * @property {number} success? - total success runs
 * @property {number} fail? - total fail runs
 * @property {number} avg? - avg run time
 * @property {string} ignored_reason? - If types.includes('ignored'), reason why. Not inherit for dirs!!!
 * @property {boolean} last_run_failed? - last test run was failed
 * @property {Date} last_run_date? - last test run date
 * @property {TreeFile[] | undefined} children
 */

/**
 * @typedef {Object} TestRun
 * @property {string} file zon-relative path
 * @property {Date} start start of current test file
 * @property {Date} end end of current test file
 * @property {'init' | 'success' | 'fail' | 'canceled'} result task result status
 * @property {string} error? task error
 * @property {'mocha' | 'selenium'} type test type
 */

/**
 * @typedef {Object} IgnoredTest
 * @property {string} file zon-relative path
 * @property {string} ignore_reason why ignoring test
 */

/**
 * @typedef {Object} ZDir
 * @property {TreeFile} root
 * @property {any} builds
 */

/**
 * @typedef {Object} ZonIPC
 * @property {()=>Promise<string>} get_username
 * @property {()=>Promise<{dirname: string, internal: boolean}[]>} get_zon_dirs
 * @property {(dirname: string)=>Promise<ZDir>} get_zon_dir
 * @property {(ids: string | string[])=>Promise<number>} run_tests
 * @property {(ids: string | string[])=>Promise<boolean>} stop_tests
 * @property {(ids: string | string[])=>Promise<boolean>} ignore_tests
 * @property {(ids: string | string[])=>Promise<boolean>} rm_from_ignore
 * @property {(path: string)=>Promise<string>} dirname
 */