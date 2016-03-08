const spawn = require('child_process').spawn;

import test from 'ava';

import PseudoProcess from '../lib/pseudo-process';

test('constructor sets killHandler', t => {
	const killHandler = {foo: 'bar'};
	t.is(new PseudoProcess(killHandler, -1, []).killHandler, killHandler);
});

test('kill delegates to killHandler', t => {
	t.plan(1);

	const signal = {foo: 'bar'};

	const killHandler = function (arg) {
		t.is(arg, signal);
	};

	new PseudoProcess(killHandler, -1, []).kill(signal);
});

test('kill defaults the signal to \'SIGTERM\'', t => {
	const killHandler = function (arg) {
		t.is(arg, 'SIGTERM');
	};

	new PseudoProcess(killHandler, -1, []).kill();
});

test('killHandler calls are bound to the context of the PseudoProcess', t => {
	const killHandler = function () {
		t.is(this.foo, 'bar');
	};

	const pp = new PseudoProcess(killHandler, -1, []);
	pp.foo = 'bar';
	pp.kill();
});

test('constructor sets pid', t => {
	const pid = {foo: 'bar'};
	t.is(new PseudoProcess(null, pid, []).pid, pid);
});

test('constructor sets stdio', t => {
	const stdio = {foo: 'bar'};
	t.is(new PseudoProcess(null, -1, stdio).stdio, stdio);
});

test('stdin is alias for stdio[0]', t => {
	const stdio = [{foo: 'bar'}];
	t.is(new PseudoProcess(null, -1, stdio).stdin, stdio[0]);
});

test('stdout is alias for stdio[1]', t => {
	const stdio = [undefined, {foo: 'bar'}];
	t.is(new PseudoProcess(null, -1, stdio).stdout, stdio[1]);
});

test('stderr is alias for stdio[2]', t => {
	const stdio = [undefined, undefined, {foo: 'bar'}];
	t.is(new PseudoProcess(null, -1, stdio).stderr, stdio[2]);
});

test.cb('wrapChildProcess delegates kill to child', t => {
	t.plan(1);

	const grep = spawn('grep', ['ssh']);
	grep.on('close', () => {
		t.pass();
		t.end();
	});

	PseudoProcess.wrapChildProcess(grep).kill('SIGHUP');
});

test('wrapChildProcess sets pid to child-pid', t => {
	const child = spawn('ls');

	const pp = PseudoProcess.wrapChildProcess(child);
	t.is(pp.pid, child.pid);
});

test('wrapChildProcess sets stdio to child\'s stdio', t => {
	const child = spawn('ls');

	const pp = PseudoProcess.wrapChildProcess(child);
	t.is(pp.stdio, child.stdio);
});

test.cb('wrapChildProcess propagates the child\'s events to the PseudoProcess', t => {
	t.plan(3);
	const child = spawn('ls');

	const eventArg = {foo: 'bar'};

	// flag to determine when to end the test
	let cl = false;
	let er = false;
	let ex = false;

	const pp = PseudoProcess.wrapChildProcess(child);
	pp.on('close', arg => {
		t.is(arg, 0);
		cl = true;
		if (cl && er && ex) {
			t.end();
		}
	});
	pp.on('error', arg => {
		t.is(arg, eventArg);
		er = true;
		if (cl && er && ex) {
			t.end();
		}
	});
	pp.on('exit', arg => {
		t.is(arg, 0);
		ex = true;
		if (cl && er && ex) {
			t.end();
		}
	});
	// never called
	pp.on('foo', () => {
		t.fail();
	});

	child.emit('foo', eventArg);
	child.emit('error', eventArg);
});

test.cb('pipe pipes stdout of the pp into stdin of the second pp', t => {
	t.plan(2);

	const child1 = spawn('echo', ['foo', 'bar']);
	const child2 = spawn('grep', ['foo']);

	const pp1 = PseudoProcess.wrapChildProcess(child1);
	const pp2 = PseudoProcess.wrapChildProcess(child2);

	pp2.stdin.on('pipe', () => {
		t.pass();
	});

	pp2.stdout.on('data', data => {
		t.same(data.toString(), 'foo bar\n');
		t.end();
	});

	pp1.pipe(pp2);
});
