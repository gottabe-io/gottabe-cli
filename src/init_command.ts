import utils from './utils';
import {CommandInterface} from "./command_interface";
import yaml from "yaml";
import {ArtifactTypes} from './base_types';

const TYPES = Object.values(ArtifactTypes).concat('plugin');

export const initProject = async() => {
    if (utils.findBuildFile()) {
        console.log('A project file was found on the current directory.');
    } else {
        let cmd : CommandInterface = new CommandInterface();
        let groupId = await cmd.question('What\'s the group identifier of your project?', undefined, true);
        let artifactId = await cmd.question('What\'s the artifact identifier of your project?', undefined, true);
        let version = await cmd.question('What\'s the version of your project?', '1.0.0', true);
        let description = await cmd.question('Add a description (optional):');
        let author = await cmd.question('Type the author name (optional):');
        let license = await cmd.question('Add a license (optional):');
        let type = await cmd.question('Select the type of the artifact generated:\n\t1 - executable\n\t2 - shared_library\n\t3 - static_library\n\t4 - driver\n\t5 - parent project\n\t6 - plugin\nAnswer:', undefined, true);
        type = TYPES[parseInt(type || '1') - 1];
        let main = type == 'plugin' ? await cmd.question('Whats the name of the main script of the plugin?', undefined, true) : null;
        let value = type == 'plugin'
            ? {groupId, artifactId, version, description, author, license, main}
            : {groupId, artifactId, version, description, author, license, type};
        let filetype = await cmd.question('Type the file type(json or yml):', 'json');
        let filename = (type == 'plugin' ? 'plugin' : 'build') + '.'
            + (filetype == 'json' ? 'json' : 'yml');
        let data = filetype == 'json' ? JSON.stringify(value, null, 4) : yaml.stringify(value);
        utils.writeFileSync(filename, data);
        await cmd.close();
    }
};
