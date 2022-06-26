import {BuildPhase, PhaseParams} from "./base_types";
import {packageManager} from "./package_manager";

export class InstallPhase implements BuildPhase {

    async build(phaseParams: PhaseParams): Promise<void> {
        await packageManager.publishLocal(phaseParams.project);
    }

}
