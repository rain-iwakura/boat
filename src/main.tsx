/* @refresh reload */
import { render } from 'solid-js/web';

import * as navigation from '~/globals/navigation';
import { configureRouter } from '~/lib/navigation/router';

import './styles/app.css';

import routes from './routes';
import Shell from './shell';

configureRouter({
	history: navigation.history,
	logger: navigation.logger,
	routes: routes,
});

const App = () => {
	return <Shell />;
};

render(App, document.body);
