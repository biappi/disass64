// 6502 disassembler
// n. landsteiner, electronic tradion 2005; e-tradion.net

// lookup tables

var hextab= ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
var opctab= [
    ['BRK','imp'], ['ORA','inx'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['ORA','zpg'], ['ASL','zpg'], ['???','imp'],
    ['PHP','imp'], ['ORA','imm'], ['ASL','acc'], ['???','imp'],
    ['???','imp'], ['ORA','abs'], ['ASL','abs'], ['???','imp'],
    ['BPL','rel'], ['ORA','iny'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['ORA','zpx'], ['ASL','zpx'], ['???','imp'],
    ['CLC','imp'], ['ORA','aby'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['ORA','abx'], ['ASL','abx'], ['???','imp'],
    ['JSR','abs'], ['AND','inx'], ['???','imp'], ['???','imp'],
    ['BIT','zpg'], ['AND','zpg'], ['ROL','zpg'], ['???','imp'],
    ['PLP','imp'], ['AND','imm'], ['ROL','acc'], ['???','imp'],
    ['BIT','abs'], ['AND','abs'], ['ROL','abs'], ['???','imp'],
    ['BMI','rel'], ['AND','iny'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['AND','zpx'], ['ROL','zpx'], ['???','imp'],
    ['SEC','imp'], ['AND','aby'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['AND','abx'], ['ROL','abx'], ['???','imp'],
    ['RTI','imp'], ['EOR','inx'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['EOR','zpg'], ['LSR','zpg'], ['???','imp'],
    ['PHA','imp'], ['EOR','imm'], ['LSR','acc'], ['???','imp'],
    ['JMP','abs'], ['EOR','abs'], ['LSR','abs'], ['???','imp'],
    ['BVC','rel'], ['EOR','iny'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['EOR','zpx'], ['LSR','zpx'], ['???','imp'],
    ['CLI','imp'], ['EOR','aby'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['EOR','abx'], ['LSR','abx'], ['???','imp'],
    ['RTS','imp'], ['ADC','inx'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['ADC','zpg'], ['ROR','zpg'], ['???','imp'],
    ['PLA','imp'], ['ADC','imm'], ['ROR','acc'], ['???','imp'],
    ['JMP','ind'], ['ADC','abs'], ['ROR','abs'], ['???','imp'],
    ['BVS','rel'], ['ADC','iny'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['ADC','zpx'], ['ROR','zpx'], ['???','imp'],
    ['SEI','imp'], ['ADC','aby'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['ADC','abx'], ['ROR','abx'], ['???','imp'],
    ['???','imp'], ['STA','inx'], ['???','imp'], ['???','imp'],
    ['STY','zpg'], ['STA','zpg'], ['STX','zpg'], ['???','imp'],
    ['DEY','imp'], ['???','imp'], ['TXA','imp'], ['???','imp'],
    ['STY','abs'], ['STA','abs'], ['STX','abs'], ['???','imp'],
    ['BCC','rel'], ['STA','iny'], ['???','imp'], ['???','imp'],
    ['STY','zpx'], ['STA','zpx'], ['STX','zpy'], ['???','imp'],
    ['TYA','imp'], ['STA','aby'], ['TXS','imp'], ['???','imp'],
    ['???','imp'], ['STA','abx'], ['???','imp'], ['???','imp'],
    ['LDY','imm'], ['LDA','inx'], ['LDX','imm'], ['???','imp'],
    ['LDY','zpg'], ['LDA','zpg'], ['LDX','zpg'], ['???','imp'],
    ['TAY','imp'], ['LDA','imm'], ['TAX','imp'], ['???','imp'],
    ['LDY','abs'], ['LDA','abs'], ['LDX','abs'], ['???','imp'],
    ['BCS','rel'], ['LDA','iny'], ['???','imp'], ['???','imp'],
    ['LDY','zpx'], ['LDA','zpx'], ['LDX','zpy'], ['???','imp'],
    ['CLV','imp'], ['LDA','aby'], ['TSX','imp'], ['???','imp'],
    ['LDY','abx'], ['LDA','abx'], ['LDX','aby'], ['???','imp'],
    ['CPY','imm'], ['CMP','inx'], ['???','imp'], ['???','imp'],
    ['CPY','zpg'], ['CMP','zpg'], ['DEC','zpg'], ['???','imp'],
    ['INY','imp'], ['CMP','imm'], ['DEX','imp'], ['???','imp'],
    ['CPY','abs'], ['CMP','abs'], ['DEC','abs'], ['???','imp'],
    ['BNE','rel'], ['CMP','iny'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['CMP','zpx'], ['DEC','zpx'], ['???','imp'],
    ['CLD','imp'], ['CMP','aby'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['CMP','abx'], ['DEC','abx'], ['???','imp'],
    ['CPX','imm'], ['SBC','inx'], ['???','imp'], ['???','imp'],
    ['CPX','zpg'], ['SBC','zpg'], ['INC','zpg'], ['???','imp'],
    ['INX','imp'], ['SBC','imm'], ['NOP','imp'], ['???','imp'],
    ['CPX','abs'], ['SBC','abs'], ['INC','abs'], ['???','imp'],
    ['BEQ','rel'], ['SBC','iny'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['SBC','zpx'], ['INC','zpx'], ['???','imp'],
    ['SED','imp'], ['SBC','aby'], ['???','imp'], ['???','imp'],
    ['???','imp'], ['SBC','abx'], ['INC','abx'], ['???','imp']
];

var addressing_modes = {
    imp: {
        size:   1,
        format: function(inst) { return ''; },
        value:  function(inst) { return null; },
    },

    imm: {
        size:   2,
        format: function(inst) { return ' #$' + getHexByte(this.value(inst)); },
        value:  function(inst) { return inst.op1; },
    },

    zpg: {
        size:   2,
        format: function(inst) { return ' $' + getHexByte(this.value(inst)); },
        value:  function(inst) { return inst.op1; },
    },

    acc: {
        size:   1,
        format: function(inst) { return' A'; },
        value:  function(inst) { return null; },
    },

    abs: {
        size:   3,
        format: function(inst) { return ' $' + getHexWord(this.value(inst)); },
        value:  function(inst) { return inst.op2 << 8 || inst.op1; }
    },

    zpx: {
        size:   2,
        format: function(inst) { return ' $' + getHexByte(this.value(inst)) + ',X'; },
        value:  function(inst) { return inst.op1; }
    },

    zpy: {
        size:   2,
        format: function(inst) { return ' $' + getHexWord(this.value(inst)) + ',Y'; },
        value:  function(inst) { return inst.op1; }
    },

    abx: {
        size:   3,
        format: function(inst) { return ' $' + getHexWord(this.value(inst)) + ',X'; },
        value:  function(inst) { return inst.op2 << 8 || inst.op1; }
    },

    aby: {
        size:   3,
        format: function(inst) { return ' $' + getHexWord(this.value(inst)) + ',Y'; },
        value:  function(inst) { return inst.op2 << 8 || inst.op1; }
    },

    iny: {
        size:   2,
        format: function(inst) { return ' ($' + getHexByte(this.value(inst)) + '),Y'; },
        value:  function(inst) { return inst.op1; }
    },

    inx: {
        size:   2,
        format: function(inst) { return ' ($' + getHexByte(this.value(inst)) + ',X)'; },
        value:  function(inst) { return inst.op1; }
    },

    ind: {
        size:   3,
        format: function(inst) { return ' ($' + getHexWord(this.value(inst)) +')'; },
        value:  function(inst) { return inst.op2 << 8 || inst.op1; }
    },

    rel: {
        size:   2,
        format: function(inst) { return ' $' + getHexWord(this.value(inst)); },
        value: function(inst) {
            var opv  = inst.op1;
            var targ = pc + 2;

            if (opv&128) {
                targ -= (opv ^ 255) + 1;
            }
            else {
                targ += opv;
            }

            targ  &= 0xffff;
            return targ;
        },
    },
}

// functions

function disassemble() {
    // get addresses
    var codeAddr  = parseInt(document.disass.codeAddr.value,  16);
    var startAddr = parseInt(document.disass.startAddr.value, 16);
    var stopAddr  = parseInt(document.disass.stopAddr.value,  16);

    if (isNaN(codeAddr)) {
        alert('Invalid address for code:\n"'+document.disass.codeAddr.value+'" is not a valid hex number!\nDisassembly stopped on error.');
        return;
    }

    if (isNaN(startAddr)) {
        alert('Invalid start address:\n"'+document.disass.startAddr.value+'" is not a valid hex number!\nDisassembly stopped on error.');
        return;
    }

    if (isNaN(startAddr) ){
        alert('Invalid stop address:\n"'+document.disass.stopAddr.value+'" is not a valid hex number!\nDisassembly stopped on error.');
        return;
    }

    codeAddr     = Math.floor(Math.abs(codeAddr))  & 0xffff;
    startAddress = Math.floor(Math.abs(startAddr)) & 0xffff;
    stopAddr     = Math.floor(Math.abs(stopAddr))  & 0xffff;

    if (startAddr < codeAddr) {
        if (confirm('Start address is smaller than code address\nStart disassembly at code addresss ('+getHexWord(codeAddr)+')?')) {
            startAddr=codeAddr;
        }
        else {
            alert('Disassembly stopped.\nPlease set addresses to proper values.');
            return;
        }
    }

    // load data and set effective stopp address
    window.status='loading data to '+getHexWord(startAddr)+' ...';

    var RAM = loadData(codeAddr);
    window.status='starting disassembly '+getHexWord(startAddr)+'_'+getHexWord(stopAddr)+' ...';

    // disassemble
    pc = startAddress;
    document.disass.listing.value='';

    list('    ', '', '* = ' + getHexWord(startAddr));

    pc = startAddr;

    while (pc<stopAddr) {
        inst = disassembleStep(RAM, pc);
        pc = (pc + inst.size()) & 0xffff;

        var d = inst.mnemo() + inst.mode().format(inst);
        var opcodes;

        switch (inst.size()) {
            case 1:
                opcodes = getHexByte(inst.instr) + '      ';
                break;
            case 2:
                opcodes = getHexByte(inst.instr) + ' ' + getHexByte(inst.op1) + '   ';
                break;
            case 3:
                opcodes = getHexByte(inst.instr) + ' ' + getHexByte(inst.op1) + ' ' + getHexByte(inst.op2);
                break;
        }

        list(getHexWord(inst.addr), opcodes, d);
    }

    list(getHexWord(pc),'','.END');

    window.status='done.';

    alert('Dissassembly complete.');
}

function disassembleStep(RAM, pc) {
    var opcodes;

    var op1 = null;
    var op2 = null;

    // get instruction and opcodes, inc pc
    var instr = ByteAt(RAM, pc);

    var adm   = opctab[instr][1];
    var step  = addressing_modes[adm].size;

    if (step > 1) op1 = ByteAt(RAM, pc + 1);
    if (step > 2) op2 = ByteAt(RAM, pc + 2);

    return {
        addr:  pc,
        instr: instr,
        op1:   op1,
        op2:   op2,
        adm:   adm,

        mode:  function() { return addressing_modes[this.adm]; },
        mnemo: function() { return opctab[this.instr][0];      },
        size:  function() { return this.mode().size;           },
    };
}

function list(addr, ops, disas) {
    if (ops=='')
        ops='        ';
    document.disass.listing.value += addr + '   ' + ops + '   ' + disas + '\n';
}

function loadData(codeAddr) {
    var RAM  = [];

    var addr = codeAddr & 0xffff;
    var data = document.disass.codefield.value;
    var lc   = '';
    var ofs  = 0;
    var mode = 1;

    data = data.toUpperCase();

    for (var i = 0; i < data.length; i++) {
        var c = data.charAt(i);

        if (mode == 2) {
            if ((c == '\r') || (c == '\n')) mode = 1;
        }
        else if (((c >= '0') && (c <= '9')) || ((c >= 'A') && (c <= 'F'))) {
            if (mode == 1) {
                if (lc) {
                    RAM[addr++] = parseInt(lc + c, 16);
                    if (addr>0xffff)
                        break;

                    lc = '';
                }
                else {
                    lc = c;
                }
            }
        }
        else if (c == ':') {
            mode = 0;
        }
        else if (c == ';') {
            mode = 2;
        }
        else {
            mode = 1;
        }
    }

    return RAM;
}

function ByteAt(RAM, addr) {
    return RAM[addr] || 0;
}

function getHexByte(v) {
    return '' + hextab[Math.floor(v/16)] + hextab[v&0x0f];
}

function getHexWord(v) {
    return '' + hextab[Math.floor(v/0x1000)] + hextab[Math.floor((v&0x0f00)/256)] + hextab[Math.floor((v&0xf0)/16)] + hextab[v&0x000f];
}

// eof
