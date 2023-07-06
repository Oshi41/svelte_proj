const script_txt = filepath=>`
const fs = require('fs');
const path = require('path');  
process.env.BUILD = '${process.env.BUILD}';
let indent = (text, n)=>'    '.repeat(n)+text;
let inspect = (suite, depth)=>{
    console.log(indent(\`* \${suite.title || '.+'}\`, depth));
    suite.suites.forEach(suite=>inspect(suite, depth +1));
    suite.tests.forEach(test=>
        console.log(indent(\`- \${test.title}\`, depth+1)));
};
let file_name = '/usr/local/bin/_mocha';
process.argv = [process.argv[0], file_name, '${filepath}'];
require(file_name);        
before(function(){
    inspect(this.test.parent, 0);
    process.exit(0);
});
`;

export const running_tests = new Map();

class Run_test_command {
    /**
     * @param files {Z_File_Or_Folder[]}
     */
    constructor(files) {
        this.files = files;
    }

    _can_run(){
        if (!this.files?.length)
            throw new Error('Select files to run tests');

        let files = this.files.filter(x=>!x.is_selenium && !x.is_mocha);
        if (files.length)
            throw Object.assign(new Error('Selected files contains not runnable'), {files});

        files = this.files.filter(x=>running_tests.has(x.abs_path));
        if (!files.length)
            throw Object.assign(new Error('Already running'), {files});

        return true;
    }


    async run(){
        if (!this._can_run())
            return false;


    };
}