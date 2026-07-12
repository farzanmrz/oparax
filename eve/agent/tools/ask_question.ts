import { disableTool } from "eve/tools";

// ask_question is disabled (ft/44). It parks the run on "Awaiting Approval" with
// no UI affordance in the create-agent chat, yet the agent proceeds anyway — so
// the pause is invisible dead weight. Step 7 (review & save) now offers
// save / keep-tweaking / jump-back as plain prose instead. Re-enable (delete
// this file) once an approval UI exists. The filename binds the disable to
// ask_question; disableTool() takes no argument (see the other sentinels).
export default disableTool();
