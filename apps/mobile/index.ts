import { registerRootComponent } from 'expo';

import { Root } from './src/components/Root';

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root).
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
//
// Root is App wrapped in an ErrorBoundary. The wrapper lives above App rather than
// inside it because React only looks for a boundary ABOVE the component that
// threw, and the throws worth catching here are App's own effects. (This file is
// .ts and cannot hold JSX, which is the other reason the wrapper is its own file.)
registerRootComponent(Root);
