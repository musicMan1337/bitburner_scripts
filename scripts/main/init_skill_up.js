/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    const ATTACKER = ns.args[0];

    // spin up attack servers
    let files = ['weaken.script', 'grow.script', 'hack.script', 'skill_up.js'];

    if (ATTACKER !== 'home') {
        ns.killall(ATTACKER);
        await ns.scp(files, 'home', ATTACKER);
    }

    ns.exec('skill_up.js', ATTACKER, 1, ATTACKER);
}
