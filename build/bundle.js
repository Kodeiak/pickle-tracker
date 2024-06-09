
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (96:4) {#each games as game, index}
    function create_each_block(ctx) {
    	let div4;
    	let div0;
    	let t0_value = /*index*/ ctx[17] + 1 + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = /*game*/ ctx[15].date + "";
    	let t2;
    	let t3;
    	let div2;
    	let t4_value = /*game*/ ctx[15].player1 + "";
    	let t4;
    	let t5;
    	let t6_value = /*game*/ ctx[15].player1Score + "";
    	let t6;
    	let t7;
    	let t8_value = /*game*/ ctx[15].player2 + "";
    	let t8;
    	let t9;
    	let t10_value = /*game*/ ctx[15].player2Score + "";
    	let t10;
    	let t11;
    	let t12;
    	let div3;
    	let t13;
    	let t14_value = /*game*/ ctx[15].winningSideOfCourt + "";
    	let t14;
    	let t15;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(t4_value);
    			t5 = text(" (");
    			t6 = text(t6_value);
    			t7 = text(") - ");
    			t8 = text(t8_value);
    			t9 = text(" (");
    			t10 = text(t10_value);
    			t11 = text(")");
    			t12 = space();
    			div3 = element("div");
    			t13 = text("Winning Side: ");
    			t14 = text(t14_value);
    			t15 = space();
    			attr_dev(div0, "class", "svelte-1y5dwn6");
    			add_location(div0, file, 97, 12, 2265);
    			attr_dev(div1, "class", "svelte-1y5dwn6");
    			add_location(div1, file, 98, 12, 2300);
    			attr_dev(div2, "class", "svelte-1y5dwn6");
    			add_location(div2, file, 99, 12, 2335);
    			attr_dev(div3, "class", "svelte-1y5dwn6");
    			add_location(div3, file, 100, 12, 2434);
    			attr_dev(div4, "class", "game svelte-1y5dwn6");
    			add_location(div4, file, 96, 8, 2234);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, t0);
    			append_dev(div4, t1);
    			append_dev(div4, div1);
    			append_dev(div1, t2);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div2, t4);
    			append_dev(div2, t5);
    			append_dev(div2, t6);
    			append_dev(div2, t7);
    			append_dev(div2, t8);
    			append_dev(div2, t9);
    			append_dev(div2, t10);
    			append_dev(div2, t11);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			append_dev(div3, t13);
    			append_dev(div3, t14);
    			append_dev(div4, t15);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*games*/ 1 && t2_value !== (t2_value = /*game*/ ctx[15].date + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*games*/ 1 && t4_value !== (t4_value = /*game*/ ctx[15].player1 + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*games*/ 1 && t6_value !== (t6_value = /*game*/ ctx[15].player1Score + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*games*/ 1 && t8_value !== (t8_value = /*game*/ ctx[15].player2 + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*games*/ 1 && t10_value !== (t10_value = /*game*/ ctx[15].player2Score + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*games*/ 1 && t14_value !== (t14_value = /*game*/ ctx[15].winningSideOfCourt + "")) set_data_dev(t14, t14_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(96:4) {#each games as game, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div6;
    	let h2;
    	let t1;
    	let div0;
    	let label0;
    	let t2;
    	let input0;
    	let t3;
    	let div1;
    	let label1;
    	let t4;
    	let input1;
    	let t5;
    	let div2;
    	let label2;
    	let t6;
    	let input2;
    	let t7;
    	let div3;
    	let label3;
    	let t8;
    	let select;
    	let option0;
    	let option1;
    	let t11;
    	let div4;
    	let label4;
    	let t12;
    	let t13;
    	let input3;
    	let t14;
    	let div5;
    	let label5;
    	let t15;
    	let t16;
    	let input4;
    	let t17;
    	let button;
    	let t19;
    	let h3;
    	let t21;
    	let mounted;
    	let dispose;
    	let each_value = /*games*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Pickleball Score Tracker";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			t2 = text("Player 1 Name:\n            ");
    			input0 = element("input");
    			t3 = space();
    			div1 = element("div");
    			label1 = element("label");
    			t4 = text("Player 2 Name:\n            ");
    			input1 = element("input");
    			t5 = space();
    			div2 = element("div");
    			label2 = element("label");
    			t6 = text("Date:\n            ");
    			input2 = element("input");
    			t7 = space();
    			div3 = element("div");
    			label3 = element("label");
    			t8 = text("Winning Side of Court:\n            ");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "North";
    			option1 = element("option");
    			option1.textContent = "South";
    			t11 = space();
    			div4 = element("div");
    			label4 = element("label");
    			t12 = text(/*player1*/ ctx[1]);
    			t13 = text(" Score:\n            ");
    			input3 = element("input");
    			t14 = space();
    			div5 = element("div");
    			label5 = element("label");
    			t15 = text(/*player2*/ ctx[2]);
    			t16 = text(" Score:\n            ");
    			input4 = element("input");
    			t17 = space();
    			button = element("button");
    			button.textContent = "Add Game";
    			t19 = space();
    			h3 = element("h3");
    			h3.textContent = "Game History";
    			t21 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "svelte-1y5dwn6");
    			add_location(h2, file, 58, 4, 1199);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file, 61, 12, 1285);
    			add_location(label0, file, 60, 8, 1251);
    			add_location(div0, file, 59, 4, 1237);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file, 66, 12, 1406);
    			add_location(label1, file, 65, 8, 1372);
    			add_location(div1, file, 64, 4, 1358);
    			attr_dev(input2, "type", "date");
    			add_location(input2, file, 71, 12, 1518);
    			add_location(label2, file, 70, 8, 1493);
    			add_location(div2, file, 69, 4, 1479);
    			option0.__value = "North";
    			option0.value = option0.__value;
    			add_location(option0, file, 77, 16, 1701);
    			option1.__value = "South";
    			option1.value = option1.__value;
    			add_location(option1, file, 78, 16, 1754);
    			if (/*winningSideOfCourt*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[11].call(select));
    			add_location(select, file, 76, 12, 1644);
    			add_location(label3, file, 75, 8, 1602);
    			add_location(div3, file, 74, 4, 1588);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "min", "0");
    			add_location(input3, file, 84, 12, 1895);
    			add_location(label4, file, 83, 8, 1859);
    			add_location(div4, file, 82, 4, 1845);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "min", "0");
    			add_location(input4, file, 89, 12, 2033);
    			add_location(label5, file, 88, 8, 1997);
    			add_location(div5, file, 87, 4, 1983);
    			add_location(button, file, 92, 4, 2121);
    			add_location(h3, file, 94, 4, 2171);
    			attr_dev(div6, "class", "scoreboard svelte-1y5dwn6");
    			add_location(div6, file, 57, 0, 1170);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, h2);
    			append_dev(div6, t1);
    			append_dev(div6, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t2);
    			append_dev(label0, input0);
    			set_input_value(input0, /*player1*/ ctx[1]);
    			append_dev(div6, t3);
    			append_dev(div6, div1);
    			append_dev(div1, label1);
    			append_dev(label1, t4);
    			append_dev(label1, input1);
    			set_input_value(input1, /*player2*/ ctx[2]);
    			append_dev(div6, t5);
    			append_dev(div6, div2);
    			append_dev(div2, label2);
    			append_dev(label2, t6);
    			append_dev(label2, input2);
    			set_input_value(input2, /*date*/ ctx[6]);
    			append_dev(div6, t7);
    			append_dev(div6, div3);
    			append_dev(div3, label3);
    			append_dev(label3, t8);
    			append_dev(label3, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			select_option(select, /*winningSideOfCourt*/ ctx[5], true);
    			append_dev(div6, t11);
    			append_dev(div6, div4);
    			append_dev(div4, label4);
    			append_dev(label4, t12);
    			append_dev(label4, t13);
    			append_dev(label4, input3);
    			set_input_value(input3, /*player1Score*/ ctx[3]);
    			append_dev(div6, t14);
    			append_dev(div6, div5);
    			append_dev(div5, label5);
    			append_dev(label5, t15);
    			append_dev(label5, t16);
    			append_dev(label5, input4);
    			set_input_value(input4, /*player2Score*/ ctx[4]);
    			append_dev(div6, t17);
    			append_dev(div6, button);
    			append_dev(div6, t19);
    			append_dev(div6, h3);
    			append_dev(div6, t21);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div6, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[10]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[11]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[12]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[13]),
    					listen_dev(button, "click", /*addGame*/ ctx[7], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*player1*/ 2 && input0.value !== /*player1*/ ctx[1]) {
    				set_input_value(input0, /*player1*/ ctx[1]);
    			}

    			if (dirty & /*player2*/ 4 && input1.value !== /*player2*/ ctx[2]) {
    				set_input_value(input1, /*player2*/ ctx[2]);
    			}

    			if (dirty & /*date*/ 64) {
    				set_input_value(input2, /*date*/ ctx[6]);
    			}

    			if (dirty & /*winningSideOfCourt*/ 32) {
    				select_option(select, /*winningSideOfCourt*/ ctx[5]);
    			}

    			if (dirty & /*player1*/ 2) set_data_dev(t12, /*player1*/ ctx[1]);

    			if (dirty & /*player1Score*/ 8 && to_number(input3.value) !== /*player1Score*/ ctx[3]) {
    				set_input_value(input3, /*player1Score*/ ctx[3]);
    			}

    			if (dirty & /*player2*/ 4) set_data_dev(t15, /*player2*/ ctx[2]);

    			if (dirty & /*player2Score*/ 16 && to_number(input4.value) !== /*player2Score*/ ctx[4]) {
    				set_input_value(input4, /*player2Score*/ ctx[4]);
    			}

    			if (dirty & /*games*/ 1) {
    				each_value = /*games*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div6, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let games = [];
    	let player1 = "Player 1";
    	let player2 = "Player 2";
    	let player1Score = 0;
    	let player2Score = 0;
    	let winningSideOfCourt = "North";
    	let date = "";

    	const addGame = () => {
    		const game = {
    			date: date || new Date().toLocaleDateString(),
    			player1,
    			player2,
    			player1Score,
    			player2Score,
    			winningSideOfCourt
    		};

    		$$invalidate(0, games = [...games, game]);
    		resetScores();
    	};

    	const resetScores = () => {
    		$$invalidate(3, player1Score = 0);
    		$$invalidate(4, player2Score = 0);
    		$$invalidate(5, winningSideOfCourt = "North");
    		$$invalidate(6, date = "");
    	};

    	onMount(() => {
    		$$invalidate(6, date = new Date().toLocaleDateString());
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		player1 = this.value;
    		$$invalidate(1, player1);
    	}

    	function input1_input_handler() {
    		player2 = this.value;
    		$$invalidate(2, player2);
    	}

    	function input2_input_handler() {
    		date = this.value;
    		$$invalidate(6, date);
    	}

    	function select_change_handler() {
    		winningSideOfCourt = select_value(this);
    		$$invalidate(5, winningSideOfCourt);
    	}

    	function input3_input_handler() {
    		player1Score = to_number(this.value);
    		$$invalidate(3, player1Score);
    	}

    	function input4_input_handler() {
    		player2Score = to_number(this.value);
    		$$invalidate(4, player2Score);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		games,
    		player1,
    		player2,
    		player1Score,
    		player2Score,
    		winningSideOfCourt,
    		date,
    		addGame,
    		resetScores
    	});

    	$$self.$inject_state = $$props => {
    		if ('games' in $$props) $$invalidate(0, games = $$props.games);
    		if ('player1' in $$props) $$invalidate(1, player1 = $$props.player1);
    		if ('player2' in $$props) $$invalidate(2, player2 = $$props.player2);
    		if ('player1Score' in $$props) $$invalidate(3, player1Score = $$props.player1Score);
    		if ('player2Score' in $$props) $$invalidate(4, player2Score = $$props.player2Score);
    		if ('winningSideOfCourt' in $$props) $$invalidate(5, winningSideOfCourt = $$props.winningSideOfCourt);
    		if ('date' in $$props) $$invalidate(6, date = $$props.date);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		games,
    		player1,
    		player2,
    		player1Score,
    		player2Score,
    		winningSideOfCourt,
    		date,
    		addGame,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		select_change_handler,
    		input3_input_handler,
    		input4_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
