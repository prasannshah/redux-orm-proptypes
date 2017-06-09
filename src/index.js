import forOwn from 'lodash/forOwn';

function validateProp(validator, props, key, modelName) {
    const result = validator(props, key, modelName, 'prop', null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
    if (result instanceof Error) {
        throw result;
    }
}

function hasPropTypes(obj) {
    return typeof obj.propTypes === 'object';
}

function hasDefaultProps(obj) {
    return typeof obj.defaultProps === 'object';
}

function validateProps(props, propTypes, modelName) {
    forOwn(propTypes, (validator, key) => {
        validateProp(validator, props, key, modelName);
    });
}

export function getPropTypesMixin(userOpts) {
    const opts = userOpts || {};

    let useValidation;

    if (opts.hasOwnProperty('validate')) {
        useValidation = opts.validate;
    } else if (process) {
        useValidation = process.env.NODE_ENV !== 'production';
    } else {
        useValidation = true;
    }

    const useDefaults = opts.hasOwnProperty('useDefaults')
        ? opts.useDefaults
        : true;

    return superclass => class extends superclass {
        static create(...args) {
            const [props, ...rest] = args;


            const defaults = useDefaults && hasDefaultProps(this)
                ? this.defaultProps
                : {};

            const propsWithDefaults = Object.assign({}, defaults, props);

            if (useValidation && hasPropTypes(this)) {
                validateProps(propsWithDefaults, this.propTypes, this.modelName + '.create');
            }

            return super.create(propsWithDefaults, ...rest);
        }

        update(...args) {
            const modelClass = this.getClass();
            if (useValidation && hasPropTypes(modelClass)) {
                const props = args[0];

                const {
                    propTypes,
                    modelName,
                } = modelClass;

                // Run validators for only the props passed in, not
                // all declared PropTypes.
                forOwn(props, (val, key) => {
                    if (propTypes.hasOwnProperty(key)) {
                        const validator = propTypes[key];
                        validateProp(validator, props, key, modelName + '.update');
                    }
                });
            }

            return super.update(...args);
        }
    };
}

export default getPropTypesMixin();
