
# Diving into performance

## Environment variables

There used to be a bunch of ways to monitor wastage when rendering components,
but most of them were broken by React 16.

So, now it's mostly just the chrome dev tools.

  * `ITCH_DONT_SHOW_WEBVIEWS=1` will avoid creating any `<webview/>` elements, which lets you measure more
  accurately how much RAM the app is using.

## Production vs Development environments

When measuring some things, you may want to set `NODE_ENV=production`. Things that slow down the development
environment include:

  * React prop validations
  * Bluebird longStackTraces
  * Source map support (with require hook)
  * Hot Module Reloading (?)

## Chrome DevTools

Chrome has many tools that let us know what we're doing.

First off, don't check "Hide Violations". Violations are bad, let's not do them.

They may happen when first-time-loading large datasets, that's okay - but in normal,
we-have-almost-everything-cached state, they shouldn't happen.

Use the "Timelines" tab to see where time is spent. You can also Profile javascript,
and capture the Heap or profile memory allocations. Get to know the tools. They're good.

## React performance tips

In short:

  * Only use React.PureComponent, always
  * For connected components, use reselect (createStructuredSelector, createSelector)
  in `mapStateToProps` (grep the codebase for examples)
  * Never use `[]` or `{}` in `mapStateToProps`, do this instead:

```javascript
const emptyObj = {};
const emptyArr = [];

export default connect(SomeComponent, {
  state: createStructuredSelector({
    // Don't do this!
    baadValue: (state) => ((state.a || {}).b || [])[0];
    // Do this instead:
    goodValue: (state) => ((state.a || emptyObj).b || emptyArr)[0];
  }),
})
```

  * Anonymous functions or `this.something.bind(this)` create a new value every time,
  and will wreck `shouldComponentUpdate`.

```javascript
export BadComponent extends React.PureComponent<any, any> {
  doStuff () {
    // stuff.
  }

  render () {
    // Don't! This generates a different closure for each render call
    return <div onClick={() => this.doStuff()}/>
    // Don't either! This also generates a different function on every render
    return <div onClick={this.doStuff.bind(this)}/>
  }
}

// Do this!
export GoodComponent extends React.PureComponent<any, any> {
  // In TypeScript, this is called an instance function
  doStuff = () => {
    // stuff.
  }

  render () {
    // `this.doStuff` stays the same, won't trigger unnecessary renders
    return <div onClick={this.doStuff}/>
  }
}
```

More details in [this medium article](https://medium.com/@esamatti/react-js-pure-render-performance-anti-pattern-fb88c101332f)

## Queries

The app is SQLite-backed now, so:

  * Avoid doing filtering in components (even in `mapStateToProps`)
  * Avoid doing joins yourself
  * Avoid doing dumb queries

Use `ITCH_SQL=1` to dump SQL queries to the console.
