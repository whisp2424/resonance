class AcceleratorBuilder {
    private modifiers: string[] = [];
    private mainKey = "";

    key(k: string): this {
        this.mainKey = k.toLowerCase();
        return this;
    }

    cmdOrCtrl(): this {
        this.modifiers.push("CmdOrCtrl");
        return this;
    }

    shift(): this {
        this.modifiers.push("Shift");
        return this;
    }

    alt(): this {
        this.modifiers.push("Alt");
        return this;
    }

    toString(): string {
        return [...this.modifiers, this.mainKey].join("+");
    }
}

export function buildAccelerator(): AcceleratorBuilder {
    return new AcceleratorBuilder();
}
