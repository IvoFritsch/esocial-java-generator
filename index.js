let { java, input='./input', output='./output' } = require("args-parser")(process.argv)
java = java.replace('\\', '/')
input = input.replace('\\', '/')
output = output.replace('\\', '/')
const { readdirSync, writeFileSync, unlinkSync, renameSync } = require('fs')
const { execSync } = require('child_process');
const replace = require('replace-in-file');
const rimraf = require("rimraf");

const BIND_FILENAME = '__bindSuffix.xml'

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

const versoes = getDirectories(input)

for(let versao of versoes){
    versao = versao.replace('.', '_')
    const versaoOriginal = versao
    versao = 'v' + versao

    for(let evento of readdirSync(`${input}/${versaoOriginal}`).filter(f => f.startsWith('evt'))) {
        const file = evento
        evento = evento.slice(3).split('.')[0]
        const fullFilePath = `${input}/${versaoOriginal}/${file}`
        console.log('iniciando evento', evento, versao, "...")
        let process, xmlBinding, comando
        try {
            rimraf.sync(`${output}/esocial/eventos/${evento}/${versao}`);
            xmlBinding = criaBindingPrefixo(evento, versao, fullFilePath)
            comando = `"C:/Program Files/Java/jdk1.8.0_181/bin/xjc.exe" ${fullFilePath} -p esocial.eventos.${evento}.${versao} -d ${output} -b ./${BIND_FILENAME}`
            process = execSync(comando)
            replace.sync({
                files: [
                    `${output}/esocial/eventos/${evento}/${versao}/ESocial.java`,
                ],
                from: /ESocial/g,
                to: `ESocial_${evento}_${versao}`,
            })
            unlinkSync(`${output}/esocial/eventos/${evento}/${versao}/ObjectFactory.java`)
            renameSync(`${output}/esocial/eventos/${evento}/${versao}/ESocial.java`, `${output}/esocial/eventos/${evento}/${versao}/ESocial_${evento}_${versao}.java`)
            console.log('finalizou OK')
        } catch (e) {
            console.log(e)
            console.log("------------------------------------------------------------------------------------------------")
            console.log("Erro ao Gerar para o evento: ", evento, versao)
            console.log(`Para ver o erro crie o arquivo ${BIND_FILENAME} no diretório onde está rodando e cole nele o seguinte:`)
            console.log(xmlBinding)
            console.log(``)
            console.log(`Depois rode o comando:`)
            console.log(comando)
            console.log("------------------------------------------------------------------------------------------------")
        } finally {
            unlinkSync(BIND_FILENAME)
        }
        
    }
}

function criaBindingPrefixo(evento, versao, fullFilePath) {

    const xmlBind = `
        <jxb:bindings version="1.0" 
        xmlns:jxb="http://java.sun.com/xml/ns/jaxb" 
        xmlns:xs="http://www.w3.org/2001/XMLSchema" 
        xmlns:xjc="http://java.sun.com/xml/ns/jaxb/xjc" 
        jxb:extensionBindingPrefixes="xjc">

            <jxb:bindings schemaLocation="${fullFilePath}" node="/xs:schema">
                <jxb:schemaBindings>
                    <jxb:nameXmlTransform>
                        <jxb:typeName suffix="_${evento}_${versao}"/>
                        <jxb:anonymousTypeName suffix="_${evento}_${versao}"/>
                    </jxb:nameXmlTransform>
                </jxb:schemaBindings>
            </jxb:bindings>

        </jxb:bindings>
    `
    writeFileSync(BIND_FILENAME, xmlBind);
    return xmlBind
}