/**
 * @typedef {Object} File
 * @property {string} filename - base name
 * @property {string} fullpath - full path using as ID
 * @property {Array<'selenium' | 'mocha' | 'folder' | 'ignored' | 'running' | 'selenium'>} types
 * mocha - file contains mocha tests / directory contains files with mocha test
 * selenium - file contains selenium tests / directory contains files with selenium test
 * ignored - file/folder added to use ignored list
 * running - test is running / dir contains running tests
 * @property {Array<File> | undefined} - Folder children
 * @property {number} success? - total success runs
 * @property {number} fail? - total fail runs
 * @property {number} avg? - avg run time
 * @property {boolean} last_run_failed? - last test run was failed
 * @property {Date} last_run_date? - last test run date
 * @property {File[] | undefined} children
 */

/**
 * @typedef {Object} TestRun
 * @property {string} file zon-relative path
 * @property {Date} start start of current test file
 * @property {Date} end end of current test file
 * @property {'init' | 'success' | 'fail'} result task result status
 * @property {string} error? task error
 * @property {'mocha' | 'selenium'} type test type
 */

/**
 * @typedef {Object} IgnoredTest
 * @property {string} file zon-relative path
 * @property {string} ignore_reason why ignoring test
 */