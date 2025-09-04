["literal1", "foo"]
// ...
function MyCmp_HostBindings(rf, ctx) {
	if (rf & 1) {
		$r3$.ɵɵlistener("event1", function MyCmp_event1_HostBindingHandler() { return ctx.foo(); });
	}
	if (rf & 2) {
		$r3$.ɵɵdomProperty("prop1", ctx.foo);
		$r3$.ɵɵattribute("attr1", ctx.foo);
		$r3$.ɵɵstyleMap(ctx.foo);
        $r3$.ɵɵclassMap(ctx.foo);
		$r3$.ɵɵstyleProp("style1", true);
		$r3$.ɵɵclassProp("class1", false);
	}
}

// ...

function MyCmp_Template(rf, ctx) {
	if (rf & 1) {
		$r3$.ɵɵelementStart(0, "some-elem", 0);
		$r3$.ɵɵlistener("event1", function MyCmp_Template_some_elem_event1_0_listener() {
			return ctx.foo();
		});
		$r3$.ɵɵelementEnd();
	} if (rf & 2) {
		$r3$.ɵɵstyleProp("style1", ctx.foo);
		$r3$.ɵɵclassProp("class1", ctx.foo);
		$r3$.ɵɵattribute("attrInterp1", $r3$.ɵɵinterpolate1("interp ", ctx.foo));
		$r3$.ɵɵproperty("propInterp1", $r3$.ɵɵinterpolate1("interp ", ctx.foo))("prop1", ctx.foo);
		$r3$.ɵɵattribute("attr1", ctx.foo);
	}
}