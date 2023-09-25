import {PluginDescriptor} from "gottabe-plugin-dev";
import utils from "./utils";
import {CommandLineOptionsEx} from "./base_types";

export const buildPlugin = (file: string, commands: CommandLineOptionsEx) => {
    let plugin : PluginDescriptor;

    plugin = utils.parseBuild(file);

    commands.package = commands.package || commands.install || commands.publish;

};