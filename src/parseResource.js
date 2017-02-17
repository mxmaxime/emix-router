const _without = require('lodash/without');

/**
 *
 * @param {Object} resource
 * @return {Set}
 */
const ParseResource = function ({ _without }, resource) {
	const routes = new Set();
	const { only, without, controller, path } = resource;
  
  // C'est toujours un tableau 
  const resourceMiddleware = Array.isArray(resource.middleware) ? resource.middleware : [resource.middleware];

  if (!controller) throw new Error('Controller must be defined');
  if (!path) throw new Error('Path must be defined');

	const absPath = path; // TODO: Attention, il faut vérifier qu'il y ai bien un / devant
	const relPath = path.replace(/^\//, ''); // On enlève le / devant si il y en a un

	const actionsWithPaths = [
		{ action: 'index', path: absPath, httpVerb: 'get' },
		{ action: 'create', path: `${absPath}/create`,  httpVerb: 'get' },
		{ action: 'store', path: absPath,  httpVerb: 'post' },
		{ action: 'show', path: `${path}/:${relPath}`, httpVerb: 'get' },
		{ action: 'edit', path: `${path}/:${relPath}/edit`, httpVerb: 'get' },
		{ action: 'update', path: `${path}/:${relPath}`, httpVerb: 'put' },
		{ action: 'delete', path: `${path}/:${relPath}`,  httpVerb: 'delete' } // Ex: path = category : category/:category
	];

	const actionsAvailable = actionsWithPaths.map(ap => ap.action); // -> 'index', 'create', 'store' ....

	if (only && without) throw new Error('Only et without ne peuvent pas être défini à deux');
  // Si je n'ai ni only ni without je met toutes les actions possibles
	const actions = (!only && !without) ? actionsAvailable : only || _without(actionsAvailable, ...without); // On prend les actions à "créer"

  function buildAndAddRoute (action, middleware) {
      // On va récupérer l'objet qui défini l'action, si on en trouve pas on retourne false = error
			const actionWithInformations = actionsWithPaths.filter(ap => ap.action === action ? ap : false)[0];
      if (actionWithInformations === false) throw new Error('Erreur qui ne devrait jamais arriver');
  
      delete actionWithInformations.action;
			actionWithInformations.middleware = middleware;
			actionWithInformations.controllerMethod = `${controller}.${action}`;
      actionWithInformations.name = `${relPath}.${action}`;

			routes.add(actionWithInformations);
  }

	// Ex: only: ['create', 'store', {action: 'show', middleware: [isAdministrator]} ]
	if (only) { // On peut définir des middleware à mettre sur des actions spécifiques
    for (let action of actions) {
			let middleware = Array.from(resourceMiddleware);

			if (typeof action !== 'string') { // C'est un objet : on doit ajouter le middleware
        // Si ce n'est pas un tableau, je ne m'embête pas, j'en créé un
        if(!Array.isArray(action.middleware)) action.middleware = [action.middleware];
				middleware.push(...action.middleware);
				buildAndAddRoute(action.action, middleware);
			} else {
        // console.log({middleware})
        buildAndAddRoute(action, middleware);
      }
      
			// middleware.push(Controller[action]) // Push at the end of middleware the Controller function
    }
	} else {
    // J'ai toutes les actions par défaut, ou alors sans quelques actions (without)
    for (let action of actions) {
      buildAndAddRoute(action, resourceMiddleware);
    }
  }

	return [...routes]; // Utilisation de l'opérateur de décomposition pour transformer un Set en Array.
};

const ParseResourceFactory = (deps) => ParseResource.bind(null, deps);
const parseResource = ParseResourceFactory({ _without });

module.exports = {
  ParseResourceFactory, parseResource
};