const SVG = require('./svg');
const ITF = require('./itf');

/**
 * Calculates the modulo 11 checksum digit
 *
 * The specifications of the algorithm can be found at
 * https://portal.febraban.org.br/pagina/3166/33/pt-br/layour-arrecadacao
 *
 * @params {Array|String} digits
 * @return {Integer} The modulo 11 checksum digit
 *
 * @example
 * // Returns 7
 * modulo11('123456789');
 */
function modulo11(number) {
  let digits = number;

  if (typeof digits === 'string') {
    digits = digits.split('');
  }

  digits.reverse();

  let sum = 0;

  for (let i = 0; i < digits.length; i += 1) {
    sum += ((i % 8) + 2) * digits[i];
  }

  return (11 - (sum % 11)) % 10 || 1;
}

class Boleto {
  /**
   * Initializes the class
   *
   * @constructor
   * @param {String} bankSlipNumber The bank slip number
   */
  constructor(bankSlipNumber) {
    this.bankSlipNumber = bankSlipNumber.replace(/[^\d]/g, '');

    if (!this.valid()) {
      throw new Error('Invalid bank slip number');
    }
  }

  /**
   * Validates whether the bank slip number is valid or not
   *
   * The validation function ensures that the bank slip number is exactly 47
   * characters long, then applies the modulo-11 algorithm to the bank slip's
   * barcode. Finally, it verifies that the result of the algorithm equals the
   * checksum digit from the bank slip number.
   *
   * @return {Boolean} Whether the bank slip number is valid or not
   */
  valid() {
    if (this.bankSlipNumber.length !== 47) return false;

    const barcodeDigits = this.barcode().split('');
    const checksum = barcodeDigits.splice(4, 1);

    return (modulo11(barcodeDigits).toString() === checksum.toString());
  }

  /**
   * Converts the printed bank slip number into the barcode number
   *
   * The bank slip's number is a rearrangement of its barcode, plus three
   * checksum digits. This function executes the inverse process and returns the
   * original arrangement of the code. Specifications can be found at
   * https://portal.febraban.org.br/pagina/3166/33/pt-br/layour-arrecadacao
   *
   * @return {String} The barcode extracted from the bank slip number
   */
  barcode() {
    return this.bankSlipNumber.replace(
      /^(\d{4})(\d{5})\d{1}(\d{10})\d{1}(\d{10})\d{1}(\d{15})$/,
      '$1$5$2$3$4',
    );
  }

  /**
   * Returns the bank slip's raw number
   *
   * @return {String} The raw bank slip number
   */
  number() {
    return this.bankSlipNumber;
  }

  /**
   * Returns the bank slip number with the usual, easy-to-read mask:
   * 00000.00000 00000.000000 00000.000000 0 00000000000000
   *
   * @return {String} The formatted bank slip number
   */
  prettyNumber() {
    return this.bankSlipNumber.replace(
      /^(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d{1})(\d{14})$/,
      '$1.$2 $3.$4 $5.$6 $7 $8',
    );
  }

  /**
   * Returns the name of the bank that issued the bank slip
   *
   * This function is able to identify the most popular or commonly used banks
   * in Brazil, but not all of them are included here.
   *
   * A comprehensive list of all Brazilian banks and their codes can be found at
   * http://www.buscabanco.org.br/AgenciasBancos.asp
   *
   * @return {String} The bank name
   */
  bank() {
    /* eslint-disable quote-props */
    const banks = {
      '001': 'Banco do Brasil',
      '007': 'BNDES',
      '033': 'Santander',
      '069': 'Crefisa',
      '077': 'Banco Inter',
      '102': 'XP Investimentos',
      '104': 'Caixa Econômica Federal',
      '140': 'Easynvest',
      '197': 'Stone',
      '208': 'BTG Pactual',
      '212': 'Banco Original',
      '237': 'Bradesco',
      '260': 'Nu Pagamentos',
      '341': 'Itaú',
      '389': 'Banco Mercantil do Brasil',
      '422': 'Banco Safra',
      '505': 'Credit Suisse',
      '633': 'Banco Rendimento',
      '652': 'Itaú Unibanco',
      '735': 'Banco Neon',
      '739': 'Banco Cetelem',
      '745': 'Citibank',
    };
    /* eslint-enable quote-props */

    return banks[this.barcode().substr(0, 3)] || 'Unknown';
  }

  /**
   * Returns the currency of the bank slip
   *
   * The currency is determined by the currency code, the fourth digit of the
   * barcode. A list of values other than 9 (Brazilian Real) could not be found.
   *
   * @return {String} The currency code, symbol and decimal separator
   */
  currency() {
    switch (this.barcode()[3]) {
      case '9': return { code: 'BRL', symbol: 'R$', decimal: ',' };
      default: return 'Unknown';
    }
  }

  /**
   * Returns the verification digit of the barcode
   *
   * The barcode has its own checksum digit, which is the fifth digit of itself.
   *
   * @return {String} The checksum of the barcode
   */
  checksum() {
    return this.barcode()[4];
  }

  /**
   * Returns the date when the bank slip is due
   *
   * The portion of the barcode ranging from its sixth to its nineth digits
   * represent the number of days since the 7th of October, 1997 up to when the
   * bank slip is good to be paid. Attempting to pay a bank slip after this date
   * may incurr in extra fees.
   *
   * @return {Date} The expiration date of the bank slip
   */
  expirationDate() {
    const refDate = new Date('1997-10-07');
    const days = this.barcode().substr(5, 4);

    return new Date(refDate.getTime() + days * 86400000);
  }

  /**
   * Returns the bank slip's nominal amount
   *
   * @return {String} The bank slip's raw amount
   */
  amount() {
    return (this.barcode().substr(9, 10) / 100.0).toFixed(2);
  }

  /**
   * Returns the bank slip's formatted nominal amount
   *
   * @return {String} The bank slip's formatted amount
   */
  prettyAmount() {
    const currency = this.currency();

    if (currency === 'Unknown') {
      return this.amount();
    }

    return `${currency.symbol} ${this.amount().replace('.', currency.decimal)}`;
  }

  /**
   * Renders the bank slip as a child of the provided selector
   *
   * @param {String} selector The selector to the object where the SVG must be
   * appended
   *
   * @see {@link SVG#render}
   */
  toSVG(selector) {
    const stripes = ITF.encode(this.barcode());
    return new SVG(stripes).render(selector);
  }
}

module.exports = Boleto;
