// base imports
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';

// Bootstrap imports
import Container from 'react-bootstrap/Container';

// module imports
import Loading from './Loading.jsx';
import NdtWidget from './utils/NdtWidget.jsx';

const processError = errorMessage => {
  let text = `We're sorry, your request didn't go through. Please send the message below to the support team and we'll try to fix things as soon as we can.`;
  let debug = JSON.stringify(errorMessage);
  return [text, debug];
};

export default function JustTest(props) {
  const [settings, setSettings] = useState({});
  const locationConsent = props.location.state.locationConsent;
  const latitude = props.location.state.latitude;
  const longitude = props.location.state.longitude;
  const address = props.location.state.address;
  const surveyId = props.location.state.surveyId;
  const sessionId = props.location.state.sessionId;
  const responseId = props.location.state.responseId;
  const [formId, setFormId] = React.useState();
  const history = useHistory();

  // fetch settings from API
  const downloadSettings = () => {
    let status;
    return fetch('/api/v1/settings', {
      method: 'GET',
    })
      .then(response => {
        status = response.status;
        return response.json();
      })
      .then(result => {
        if (status === 200 || status === 201) {
          if (result.data) {
            setSettings(result.data);
            document.title = result.data.title;
            return;
          } else {
            const error = processError(result);
            throw new Error(`Error in response from server: ${error}`);
          }
        } else {
          const error = processError(result);
          throw new Error(`Error in response from server: ${error}`);
        }
      })
      .catch(error => {
        console.error('error:', error);
        throw Error(error.statusText);
      });
  };

  const downloadForm = () => {
    let status;
    return fetch('/api/v1/forms/latest', {
      method: 'GET',
    })
      .then(response => {
        status = response.status;
        return response.json();
      })
      .then(data => {
        if (status === 200 || status === 201) {
          return data;
        } else {
          let error = processError(data);
          throw new Error(`Error in response from server: ${error}`);
        }
      })
      .catch(error => {
        console.error('error:', error);
        throw Error(error.statusText);
      });
  };

  useEffect(() => {
    downloadSettings();
    if (!formId) {
      downloadForm()
        .then(res => {
          setFormId(res.data[0].id);
          //setForm(res.data[0].fields);
          //setSubmitButton(document.querySelector('.btn-toolbar input'));
          return;
        })
        .catch(error => {
          console.error('error:', error);
        });
    }
  }, []);

  const onFinish = async (finished, results, location, settings) => {
    console.log('Test complete:', finished);
    console.log('Location:', location);
    console.log('Settings:', settings);
    //const serialized = JSON.stringify(results);
    let data = {
      c2sRate: results.c2sRate,
      s2cRate: results.s2cRate,
      MinRTT: results.MinRTT,
      MaxRTT: results.MaxRTT,
      ClientIP: results.ClientIP,
      //FullResults: JSON.stringify(results),
      fields: [
        { label: 'surveyId', value: surveyId },
        { label: 'sessionId', value: sessionId },
        { label: 'responseId', value: responseId },
      ],
    };
    if (latitude !== '' && longitude !== '' && address !== '') {
      data['latitude'] = latitude;
      data['longitude'] = longitude;
      data['address'] = address;
    }
    return fetch(`/api/v1/forms/${formId}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    }).then(response => {
      if (response.ok) {
        return history.push({
          pathname: '/thankyou',
          state: {
            results: results,
            settings: settings,
          },
        });
      }
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    });
  };

  if (!settings) {
    return <Loading />;
  } else {
    return (
      <Container className={'mt-4'}>
        <style type="text/css">
          {`
            h1, h2, h3 {
              color: ${settings.color_one};
            }
            .form-group a {
              color: ${settings.color_two};
            }
            .form-group a:active, .form-group a:focus, .form-group a:hover {
              color: filter: brightness(75%) !important;
            }
            .btn-toolbar input {
              background-color: ${settings.color_two};
              border: 2px solid ${settings.color_two};
              color: #fff;
              cursor: pointer;
            }
            .btn-toolbar input.disabled {
              background-color: filter(50%);
              border: 2px solid #ccc;
              color: #ccc;
              cursor: not-allowed;
            }
          `}
        </style>
        <NdtWidget
          onFinish={onFinish}
          locationConsent={locationConsent}
          settings={settings}
        />
      </Container>
    );
  }
}

JustTest.propTypes = {
  location: PropTypes.shape({
    state: PropTypes.shape({
      settings: PropTypes.object.isRequired,
      locationConsent: PropTypes.bool,
      latitude: PropTypes.string,
      longitude: PropTypes.string,
      address: PropTypes.string,
      surveyId: PropTypes.string.isRequired,
      sessionId: PropTypes.string.isRequired,
      responseId: PropTypes.string.isRequired,
    }),
  }),
};
