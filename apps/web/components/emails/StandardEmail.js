import {
    render,
    Mjml,
    MjmlHead,
    MjmlText,
    MjmlBody,
    MjmlSection,
    MjmlColumn,
    MjmlButton,
    MjmlAttributes,
    MjmlSocial,
    MjmlSocialElement,
    MjmlDivider,
    MjmlImage,
    MjmlTitle
  } from "mjml-react";



function StandardEmail({ message, heading }){
    return( 
        <Mjml>
            <MjmlHead>
                <MjmlTitle>GRIT Hub</MjmlTitle>
                <MjmlAttributes>
                    <MjmlText color="#555" lineHeight="1.5" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" />
                </MjmlAttributes>
            </MjmlHead>
        
            
            <MjmlBody>
                <MjmlSection>
                    <MjmlColumn width="100%">
                        <MjmlImage align="left" width="300px" src="https://grithub.org.za/assets/grithub-logo-horz.png" href="https://grithub.org.za" />
                    </MjmlColumn>
                </MjmlSection>
        

                <MjmlSection>
                    <MjmlColumn>
                        <MjmlText fontSize="21px" lineHeight="1" paddingBottom="0">
                            <h1 style={{ margin: 0 }}>
                                {heading}
                            </h1>
                        </MjmlText>
                    
                        <MjmlText font-size="18px" paddingTop="0">
                            <div dangerouslySetInnerHTML={{ __html: message }} />
                        </MjmlText>
                    
                    </MjmlColumn>
                </MjmlSection>
        


                <MjmlSection>
                    <MjmlColumn>
                        <MjmlDivider borderWidth="1px" width="100%" borderStyle="solid" borderColor="lightgrey" />
                    </MjmlColumn>
                </MjmlSection>


                <MjmlSection paddingBottom="0">
                    <MjmlColumn>
                        <MjmlImage align="left" width="200px" src="https://grithub.org.za/assets/grithub-logo-horz.png" href="https://grithub.org.za"/>
                    </MjmlColumn>
                    
                    <MjmlColumn>
                        <MjmlSocial icon-size="32px" mode="horizontal" align="right">
                            <MjmlSocialElement borderRadius="99px" name="facebook" href="https://www.facebook.com/grithub.za" paddingRight="40px"/>
                            <MjmlSocialElement borderRadius="99px" name="twitter" href="https://twitter.com/grithub_za" paddingRight="40px"/>
                            <MjmlSocialElement borderRadius="99px" name="instagram" href="https://grithub.org.za/assets/instagram.svg" />
                        </MjmlSocial>
                    </MjmlColumn>        
                </MjmlSection>



                <MjmlSection paddingTop="0">
                    <MjmlColumn>
                        <MjmlText color="#aaa" paddingTop="20px" fontSize="11px">
                            <a href="https://grithub.org.za/programs" style={{ color: "#aaa"}}>Training</a> 
                            &nbsp; | &nbsp; 
                            <a href="https://grithub.org.za/consulting" style={{ color: "#aaa"}}>Consulting</a>
                            &nbsp; | &nbsp;  
                            <a href="https://grithub.org.za/incubation" style={{ color: "#aaa"}}>Incubation</a> 
                            &nbsp; | &nbsp;  
                            <a href="https://grithub.org.za/cowork" style={{ color: "#aaa" }}>CoWork</a>
                        </MjmlText>
                        
                        <MjmlText lineHeight="1.65" color="#aaa" fontSize="11px">
                            <p>©2023 The Garden Route Innovation & Technology Hub<br/>
                            York St. Blvd. Shopping Center, Suite #2, George, South Africa 6529<br/>
                            <br/>
                            All rights reserved.</p>
                        </MjmlText>
                    </MjmlColumn>
                </MjmlSection>
        
            </MjmlBody>
        </Mjml>
    )
}


export default StandardEmail;