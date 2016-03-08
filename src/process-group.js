import EventEmitter from 'events';

/**
 * A ProcessGroup wraps either a PseudoProcess or other connected ProcessGroups.
 * This allows e.g. a pipeline of ProcessGroups to be treated just like a single
 * PseudoProcess.
 *
 * Provides functions to construct ProcessGroups from other ProcessGroups for
 * lists, pipes, conditionals etc.
 */
export default class ProcessGroup extends EventEmitter {
	constructor(process) {
		super();

		this.stdio = process.stdio;
	}
}
