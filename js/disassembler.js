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
        format: '',
        value:  function(inst) { return null; },
    },

    imm: {
        size:   2,
        format: ' #$%02X',
        value:  function(inst) { return inst.op1; },
    },

    zpg: {
        size:   2,
        format: ' $%02X',
        value:  function(inst) { return inst.op1; },
    },

    acc: {
        size:   1,
        format: ' A',
        value:  function(inst) { return null; },
    },

    abs: {
        size:   3,
        format: ' $%04X',
        value:  function(inst) { return (inst.op2 << 8) | inst.op1; },
    },

    zpx: {
        size:   2,
        format: ' $%02X, X',
        value:  function(inst) { return inst.op1; }
    },

    zpy: {
        size:   2,
        format: ' $%04X, Y',
        value:  function(inst) { return inst.op1; }
    },

    abx: {
        size:   3,
        format: ' $%04X, X',
        value:  function(inst) { return (inst.op2 << 8) | inst.op1; }
    },

    aby: {
        size:   3,
        format: ' $%04X, Y',
        value:  function(inst) { return (inst.op2 << 8) | inst.op1; }
    },

    iny: {
        size:   2,
        format: ' ($%04X), Y',
        value:  function(inst) { return inst.op1; }
    },

    inx: {
        size:   2,
        format: ' ($%04X), Y',
        value:  function(inst) { return inst.op1; }
    },

    ind: {
        size:   3,
        format: ' ($%04X)',
        value:  function(inst) { return (inst.op2 << 8) | inst.op1; }
    },

    rel: {
        size:   2,
        format: ' $%04X',
        value: function(inst) {
            var opv  = inst.op1;
            var targ = inst.addr + 2;

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

function disassemble(RAM) {
    // disassemble
    var text = list('    ', '', '* = ' + getHexWord(RAM.base));

    var pc  = RAM.base;
    var end = RAM.base + RAM.size();

    while (pc < end) {
        inst = disassembleStep(RAM, pc);
        pc = (pc + inst.size()) & 0xffff;


        var ops = sprintf(inst.mode().format, inst.mode().value(inst));
        var d = inst.mnemo() + ops
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

        text += list(getHexWord(inst.addr), opcodes, d);
    }

    text += list(getHexWord(pc),'','.END');

    return text;
}

function Instruction(pc, instr, op1, op2, adm) {
    this.addr  = pc;
    this.instr = instr;
    this.op1   = op1;
    this.op2   = op2;
    this.adm   = adm;
}

Instruction.prototype.mode  = function() { return addressing_modes[this.adm]; };
Instruction.prototype.mnemo = function() { return opctab[this.instr][0];      };
Instruction.prototype.size  = function() { return this.mode().size;           };

function disassembleStep(RAM, pc) {
    var opcodes;

    var op1 = null;
    var op2 = null;

    // get instruction and opcodes, inc pc
    var instr = RAM.at(pc);

    var adm   = opctab[instr][1];
    var step  = addressing_modes[adm].size;

    if (step > 1) op1 = RAM.at(pc + 1);
    if (step > 2) op2 = RAM.at(pc + 2);

    return new Instruction(pc, instr, op1, op2, adm);
}

function list(addr, ops, disas) {
    if (ops=='')
        ops='        ';
    return addr + '   ' + ops + '   ' + disas + '\n';
}

function getHexByte(v) {
    return '' + hextab[Math.floor(v/16)] + hextab[v&0x0f];
}

function getHexWord(v) {
    return '' + hextab[Math.floor(v/0x1000)] + hextab[Math.floor((v&0x0f00)/256)] + hextab[Math.floor((v&0xf0)/16)] + hextab[v&0x000f];
}

// eof
