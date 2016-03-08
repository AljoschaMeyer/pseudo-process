import EventEmitter from 'events';
import fs from 'fs';

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

	/**
	 * Pipe this PseudoProcess into the target process, i.e. `this | target`.
	 */
	pipe(target) {
		this.stdout.pipe(target.stdin);
	}

	/**
	 * Pipe this PseudoProcess' stdout and stderr into the target process, i.e. `this |& target`
	 */
	pipeAnd(target) {
		this.stdout.pipe(target.stdin);
		this.stderr.pipe(target.stdin);
	}

	/**
	 * Open file for input into this.stdio[fd].
	 * Unlike the bash `fd< file cmd` this will not unpipe other streams writing
	 * to this.stdio[fd].
	 * @param  {string} file		path to the file to read from
	 * @param  {int} fd   			index of the stdio array, defaults to 0 (stdin)
	 * @param  {object} options options passed to fs.createReadStream
	 */
	redirectInput(file, fd = 0, options) {
		fs.createReadStream(file, options).pipe(this.stdio[fd]);
	}

	/**
	 * Write the output on this.stdio[fd] to file. Truncates file to 0 length
	 * if it already existed.
	 * Unlike the bash `cmd fd> file`, this will not unpipe this.stdion[fd] from
	 * other streams it writes to.
	 * @param  {[type]} file    path to the file to write to
	 * @param  {[type]} fd      index of the stdio array, defaults to 1 (stdout)
	 * @param  {[type]} options options passed to fs.createWriteStream
	 */
	redirectOutput(file, fd = 1, options) {
		fs.truncate(file, 0, () => {
			this.stdio[fd].pipe(fs.createWriteStream(file, options));
		});
	}

	/**
	 * Append the output on this.stdio[fd] to file.
	 * Unlike the bash `cmd fd>> file`, this will not unpipe this.stdion[fd] from
	 * other streams it writes to.
	 * @param  {[type]} file    path to the file to write to
	 * @param  {[type]} fd      index of the stdio array, defaults to 1 (stdout)
	 * @param  {[type]} options options passed to fs.createWriteStream
	 */
	redirectOutputAppend(file, fd = 1, options) {
		this.stdio[fd].pipe(fs.createWriteStream(file, options));
	}
}
