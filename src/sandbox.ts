import * as espree from 'espree';

export class Sandbox {
    exposedVariables;
    globals;

    constructor(private source: string, private allowGeneratorFunctions = false) {
        const tokens = espree.tokenize(source, { ecmaVersion: 'latest' });

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            switch (token.value) {
                // check for function() in source
                // you could use the following code to escape the sandbox because referencing this in a function will return the globalThis
                //
                //    const globals = (function () { return this })();
                //
                case "function": {
                    if (allowGeneratorFunctions) {
                        if (tokens[i + 1]?.value == "*") {
                            break;
                        }
                    }

                    throw new Error("Unsafe sandbox input. Convert conventional functions to arrow functions. Guide: https://github.com/vlvtin/vlsandbox/blob/master/doc/functions.md");

                    break;
                }
            }
        }

        this.reset();
    }

    reset() {
        this.exposedVariables = {};
        this.globals = Object.getOwnPropertyNames(globalThis).filter(name => !(/^[0-9]+$/.test(name)));
    }

    expose(name: string, value?: any) {
        if (arguments.length == 1) {
            if (name in globalThis) {
                this.exposedVariables[name] = globalThis[name];

                this.globals.splice(this.globals.indexOf(name), 1);
            } else {
                throw new Error(`Can't export ${name} automatically because it is not defined in globalThis.`);
            }
        } else {
            this.exposedVariables[name] = value;
        }
    }

    run(scope) {
        // combine global and exposed variables for argument list
        const variables = [
            ...this.globals,
            ...Object.keys(this.exposedVariables)
        ];

        // create scoped function
        const main = new Function(...variables, this.source).bind(scope || {});

        // run function
        main(...variables.map(key => key in this.exposedVariables ? this.exposedVariables[key] : null));
    }
}