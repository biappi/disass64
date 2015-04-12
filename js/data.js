function Segment(name, mem, base) {
    this.name = name;
    this.mem  = mem;
    this.base = base;
}

Segment.prototype.at = function(addr) {
    return this.mem[addr - this.base];
}

Segment.prototype.size = function() {
    return this.mem.length;
}

Segment.from_file = function (name, filename, address) {
    var request = new XMLHttpRequest();
    request.responseType = "arraybuffer";
    request.open('GET', filename, false);
    request.send(null);

    return new Segment(
        name,
        new Uint8Array(request.response),
        address
    );
}

// ------- //

var linetypes = {
    uint8: {
        size:    1,
        val:     function(line, rom) {
            return rom.at(line.addr);
        },
        to_html: function(thing) {
            return sprintf("%02X (%s)", thing.val, String.fromCharCode(thing.val));
        }
    },

    uint16: {
        size:   2,
        val:    function(line, rom) {
            return rom.at(line.addr) + (rom.at(line.addr + 1) << 8);
        },
        to_html: function(thing) {
            return sprintf("%04X", thing.val);
        },
    },

    string: {
        size:   1,
        val:    function(line, rom) {
            var val = '';
            for (var i = 0; i < line.size; i++)
                val += String.fromCharCode(rom.at(line.addr + i));

            return val;
        },
        to_html: function(thing) {
            return thing.val;
        },
        extras:  {
            increase: function(line, rom) {
                return new Line('string', line.addr, rom, line.size + 1);
            },
        },
    },

    pointer: {
        size:    2,
        val:     function(line, rom) {
            return rom.at(line.addr) + (rom.at(line.addr + 1) << 8);
        },
        to_html: function(thing, names) {
            if (thing.custom && thing.custom.target_delta) {
                var val = thing.val + thing.custom.target_delta;
                return sprintf(
                    "<a href='#loc_%04x'>(%s %s %d)</a>",
                    val,
                    names.for_display(val),
                    thing.custom.target_delta > 0 ? '-' : '+',
                    Math.abs(thing.custom.target_delta)
                );
            }
            return sprintf("<a href='#loc_%04x'>%s</a>", thing.val, names.for_display(thing.val));
        },
        extras: {
            target_delta: function(line, rom) {
                var delta = prompt('Set target delta');
                if (!delta)
                    return;

                delta = parseInt(delta);
                if (delta == NaN)
                    return;

                return new Line('pointer', line.addr, rom, line.size, {target_delta: delta});
            }
        }
    }
};

function Line(type, addr, rom, size, custom) {
    this.type = type;
    this.addr = addr;
    this.size = size || linetypes[type].size;
    this.val  = linetypes[type].val(this, rom);
    this.custom = custom;
}

function line_as_dict(line) {
    return {
        type: line.type,
        addr: line.addr,
        size: line.size,
        custom: (line.custom ? line.custom : null)
    };
}

function line_from_dict(j, rom) {
    return new Line(j.type, j.addr, rom, j.size, j.custom);
}

// ------ //

function ListItem(item, prev, next) {
    this.item = item;
    this.prev = prev;
    this.next = next;
}

function list_append(list, item) {
    if (!list) {
        return new ListItem(item, null, null);
    }
    else {
        var list_item = new ListItem(item, list, null);

        if (list.next) {
            list.next.prev = list_item;
            list_item.next = list.next;
        }

        list.next = list_item;

        return list_item;
    }
}

function list_replace(list, item) {
    var x = new ListItem(item, list.prev, list.next);
    list.prev.next = x;
    list.next.prev = x;
    return x;
}

function list_foreach(list, f) {
    var it = list;
    while (it) {
        f(it);
        it = it.next;
    }
}

function list_replace(list, item) {
    var x = new ListItem(item, list.prev, list.next);
    list.prev.next = x;
    list.next.prev = x;

    return x;
}

function list_delete(list) {
    list.next.prev = list.prev;
    list.prev.next = list.next;

    return list.next;
}

// ------ //

function Names() {
    this.addresses_to_names = {};
    this.names_to_addresses = {};
}

Names.prototype.set = function(name, address) {
    if (name) {
        this.addresses_to_names[address] = name;
        this.names_to_addresses[name]    = address;
    }
    else {
        delete this.addresses_to_names[address];
        delete this.names_to_addresses[name];
    }
}

Names.prototype.save = function() {
    return {
        a2n: this.addresses_to_names,
        n2a: this.names_to_addresses,
    };
}

Names.prototype.load = function(j) {
    this.addresses_to_names = j.a2n;
    this.names_to_addresses = j.n2a;
}

Names.prototype.for_display = function(addr) {
    var name = this.addresses_to_names[addr];
    return name || sprintf('%04X', addr);
}

Names.prototype.name = function(addr) {
    var name = this.addresses_to_names[addr];
    return name || '';
}

// ------ //

function Lines(rom, element) {
    this.rom        = rom;
    this.lines_list = null;
    this.names      = new Names();
    this.element    = element;

    element.appendChild(document.createElement('table'));

    var iterator    = null;
    for (var i = 0; i < rom.size(); i++) {
        var line = new Line('uint8', rom.base + i, rom);

        iterator = list_append(iterator, line);
        if (!this.lines_list) this.lines_list = iterator;
    }

    this.load();
    this.render();
}

Lines.prototype.load = function() {
    var xmlhttp = new XMLHttpRequest();

    var the_this = this;

    xmlhttp.onreadystatechange=function() {
        if (xmlhttp.readyState == 4) {
            var json  = xmlhttp.responseText;
            var saved = JSON.parse(json);
            var lines = saved.lines;
            var it    = null;

            the_this.lines_list = null;

            for (var i in lines) {
                it = list_append(it, line_from_dict(lines[i], the_this.rom));
                if (!the_this.lines_list) the_this.lines_list = it;
            }

            the_this.names.load(saved.names);

            the_this.render();
        }
    }

    xmlhttp.open("GET", "data.json", true);
    xmlhttp.send();
}

Lines.prototype.save = function() {
    var all_lines = []
    list_foreach(
        this.lines_list,
        function (line_item) {
            all_lines.push(line_as_dict(line_item.item));
        }
    );

    var json = {
        lines: all_lines,
        names: this.names.save(),
    };

    return JSON.stringify(json);
}

Lines.prototype.render = function() {
    var str = [];
    
    var append_here = document.createElement('table');
    this.element.replaceChild(append_here, this.element.firstChild);

    var this_lines = this;

    list_foreach(
        this.lines_list,
        function (line_item) {
            line_item.item.element = render_lineitem(line_item, this_lines);
            append_here.appendChild(line_item.item.element);
        }
    );
}

Lines.prototype.fix_lines = function(line_item, newline) {
    var target_size   = newline.size;
    var deleted_size  = 0;
    var deleted_lines = 0;

    var deleting      = line_item;

    while (deleted_size < target_size) {
        deleted_size += deleting.item.size;
        deleting = list_delete(deleting);
        deleted_lines++;
    }

    var new_lineitem  = list_append(line_item.prev, newline);
    new_lineitem.item.element = render_lineitem(new_lineitem, this);

    var padding_addr  = newline.addr + newline.size;
    var padding_bytes = deleted_size - target_size;
    var pad_item      = new_lineitem;

    line_item.item.element.parentNode.insertBefore(new_lineitem.item.element, line_item.item.element);

    for (var i = 0; i < padding_bytes; i++) {
        var pad = new Line('uint8', padding_addr + i, this.rom)
        pad_item = list_append(pad_item, pad);
        pad_item.item.element = render_lineitem(pad_item, this);
        line_item.item.element.parentNode.insertBefore(pad_item.item.element, line_item.item.element);
    }


    deleting = line_item.item.element;
    for (var i = 0; i < deleted_lines; i++) {
        var nextDeleting = deleting.nextSibling;
        deleting.parentNode.removeChild(deleting);
        deleting = nextDeleting;
    }
}

Lines.prototype.convert = function(line_item, newtype) {
    var line = line_item.item;

    if (line.type == newtype)
        return;

    var newline = new Line(newtype, line.addr, this.rom);
    this.fix_lines(line_item, newline);
}

function create_onclick(lines, lineitem, newtype) {
    return function() {
        lines.convert(lineitem, newtype);
    };
}

function create_extra(lines, lineitem, extra) {
    return function() {
        var line     = lineitem.item;
        var new_line = linetypes[line.type].extras[extra](line, lines.rom);
        lines.fix_lines(lineitem, new_line);
    }
}

function render_lineitem(line_item, lines) {
    var element = document.createElement('tr');
    element.innerHTML = render_line(line_item.item, lines.names);

    var cb_names = element.getElementsByClassName('cb_name');
    var cb_names_onclick = function() {
        var name = prompt(sprintf('Name for address %04X', line_item.item.addr));
        if (name == null)
            return;

        lines.names.set(name, line_item.item.addr);

        var eles = document.getElementsByClassName(sprintf('ad_%04x', line_item.item.addr));
        for (var i = 0; i < eles.length; i++) {
            eles[i].innerHTML = lines.names.for_display(line_item.item.addr);
        }
    };

    for (var i = 0; i < cb_names.length; i++) {
        cb_names[i].onclick = cb_names_onclick;
    }

    for (var i in linetypes[line_item.item.type].extras) {
        var cb = 'cb_ex_' + i;
        var el = element.getElementsByClassName(cb)[0];
        el.onclick = create_extra(lines, line_item, i);
    }

    for (var i in __conversions) {
        var c  = __conversions[i];
        var cb = 'cb_' + c;
        var el = element.getElementsByClassName(cb)[0];
        
        el.onclick = create_onclick(lines, line_item, c);
    }

    return element;
}


__conversions = Object.keys(linetypes);
__conversions.sort();

function render_line(line, names) {
    var label = sprintf(
        "<a href='#' class='cb_name ad_%04x'>%s</a> ",
        line.addr,
        names.name(line.addr)
    );

    var addr = sprintf(
        "<a href='#' class='cb_name'>%04X</a> ",
        line.addr
    );

    var conv = '<div class="convmenu">';
    for (var i in linetypes[line.type].extras) {
        conv += "<a href='#' class='cb_ex_" + i + "'>" + i + "</a>"; 
    }

    for (var c in __conversions) {
        var temp = __conversions[c];
        conv += "<a href='#' class='cb_" + temp + "'>" + temp + "</a>";
    }
     
    conv += '</div>';

    return [
        '<td class="conversions">',
        '<span class="edit">edit</span>',
        conv,
        '</td>',
        '<td class="label">',
        label,
        '</td>',
        '<td class="addr">',
         addr,
        '</td>',
        '<td class="line">',
        sprintf('<a name="loc_%04x"></a>', line.addr),
        linetypes[line.type].to_html(line, names),
        '</td>',
    ].join('');
}

