import EventEmitter from 'events';

/**
 * A PseudoProcess consists of a subset of node's ChildProcess' interface, but
 * does not require that things are actually running in another process.
 *
 * It omits those parts of the node ChildProcess class which are related to IPC.
 *
 * Consumers of a PseudoProcess may listen for 'close', 'error' and  'exit'
 * events, so the provider has to take care that they are emitted as necessary.
 */
export default class PseudoProcess extends EventEmitter {
	constructor(killHandler, pid, stdio) {
		super();

		this.killHandler = killHandler;
		this.pid = pid;
		this.stdio = stdio;
		this.stdin = stdio[0];
		this.stdout = stdio[1];
		this.stderr = stdio[2];
	}

	kill(signal = 'SIGTERM') {
		this.killHandler(signal);
	}

	/**
	 * Returns a PseudoProcess wrapping the given childProcess.
	 * @param  {ChildProcess} childProcess The ChildProcess to wrap.
	 * @return {PseudoProcess} a new PseudoProcess wrapping the ChildProcess.
	 */
	static wrapChildProcess(childProcess) {
		const pp = new PseudoProcess(signal => {
			childProcess.kill(signal);
		}, childProcess.pid, childProcess.stdio);

		childProcess.on('close', args => {
			pp.emit('close', args);
		});

		childProcess.on('error', args => {
			pp.emit('error', args);
		});

		childProcess.on('exit', args => {
			pp.emit('exit', args);
		});

		return pp;
	}
}
